// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";

import "forge-std/StdJson.sol";
import "forge-std/console.sol";

import {IBeacon} from "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";
import {UpgradeableBeacon} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

import {EndpointV2Mock} from "imua-contracts/test/mocks/EndpointV2Mock.sol";

import {Bootstrap} from "imua-contracts/src/core/Bootstrap.sol";
import {ClientChainGateway} from "imua-contracts/src/core/ClientChainGateway.sol";
import {RewardVault} from "imua-contracts/src/core/RewardVault.sol";

import {BootstrapStorage} from "imua-contracts/src/storage/BootstrapStorage.sol";

import {BeaconOracle} from "imua-contracts/script/integration/BeaconOracle.sol";
import {ALLOWED_CHAIN_ID, NetworkConfig} from "imua-contracts/script/integration/NetworkConfig.sol";

import {ImuaCapsule} from "imua-contracts/src/core/ImuaCapsule.sol";
import {Vault} from "imua-contracts/src/core/Vault.sol";
import {IImuaCapsule} from "imua-contracts/src/interfaces/IImuaCapsule.sol";

import {IRewardVault} from "imua-contracts/src/interfaces/IRewardVault.sol";
import {IValidatorRegistry} from "imua-contracts/src/interfaces/IValidatorRegistry.sol";
import {IVault} from "imua-contracts/src/interfaces/IVault.sol";

import {BeaconProxyBytecode} from "imua-contracts/src/utils/BeaconProxyBytecode.sol";
import {CustomProxyAdmin} from "imua-contracts/src/utils/CustomProxyAdmin.sol";

import {CREATE3_FACTORY} from "imua-contracts/lib/create3-factory/src/ICREATE3Factory.sol";

import {NetworkConstants} from "imua-contracts/src/libraries/NetworkConstants.sol";

// This is a copy of DeployBootstrap.s.sol from imua-contracts with
// modifications to help pin the version and do local deployments.
contract DeployContracts is Script {
    using stdJson for string;

    // for Bootstrap, the cross-chain communication is not super relevant.
    // however, for withdrawals, we should add this back in.
    uint16 imuachainChainId = 1;
    uint16 clientChainId = 2;

    // initial set of validators, stakers, deployers, and depositor of NST.
    // the deployer is also the owner of the contracts.
    uint256[] validators;
    uint256[] stakers;
    uint256 contractDeployer;
    uint256 nstDepositor;

    // the deployed contract.
    Bootstrap bootstrap;
    IVault[] vaults;
    CustomProxyAdmin proxyAdmin;

    // the beacon chain oracle which maps a timestamp to a beacon block root
    BeaconOracle beaconOracle;
    // the vault implementation contract
    IVault vaultImplementation;
    // the reward vault implementation contract
    IRewardVault rewardVaultImplementation;
    // the capsule implementation contract
    IImuaCapsule capsuleImplementation;
    // the vault beacon
    IBeacon vaultBeacon;
    // the capsule beacon
    IBeacon capsuleBeacon;
    // the reward vault beacon
    IBeacon rewardVaultBeacon;
    // the contract which stores the bytecode for BeaconProxy.sol
    BeaconProxyBytecode beaconProxyBytecode;
    // the network configuration contract, overrides the NetworkConstants.sol
    // for integration networks
    NetworkConfig networkConfig;

    // the virtual staked ETH address
    address internal constant VIRTUAL_STAKED_ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    // the deposit address for the ETHPOS deposit contract
    address depositContractAddress;
    // the Deneb timestamp
    uint256 denebTimestamp;
    // the Pectra timestamp
    uint256 pectraTimestamp;
    // the number of seconds per slot
    uint64 secondsPerSlot;
    // the number of slots per epoch
    uint64 slotsPerEpoch;
    // the beacon chain genesis timestamp
    uint256 beaconGenesisTimestamp;
    // the public key for the validator
    bytes pubkey;
    // a signature to prove the ownership of the private key
    // corresponding to the public key
    bytes signature;
    // the deposit data root
    bytes32 depositDataRoot;
    // salt for Bootstrap contract deployment
    bytes32 salt;

    function setUp() private {
        // placate the pre-simulation runner
        vm.chainId(ALLOWED_CHAIN_ID);
        // these are default values for Anvil's usual mnemonic.
        // the addresses are also funded in the prysm ethpos devnet
        uint256[] memory ANVIL_VALIDATORS = new uint256[](3);
        ANVIL_VALIDATORS[0] = uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80);
        ANVIL_VALIDATORS[1] = uint256(0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d);
        ANVIL_VALIDATORS[2] = uint256(0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a);

        uint256[] memory ANVIL_STAKERS = new uint256[](7);
        ANVIL_STAKERS[0] = uint256(0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6);
        ANVIL_STAKERS[1] = uint256(0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a);
        ANVIL_STAKERS[2] = uint256(0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba);
        ANVIL_STAKERS[3] = uint256(0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e);
        ANVIL_STAKERS[4] = uint256(0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356);
        ANVIL_STAKERS[5] = uint256(0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97);
        ANVIL_STAKERS[6] = uint256(0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6);

        uint256 ANVIL_CONTRACT_DEPLOYER = uint256(0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897);

        uint256 ANVIL_NST_DEPOSITOR = uint256(0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd);

        // load the keys for validators, stakers, and the contract deployer
        validators = vm.envOr("INTEGRATION_VALIDATOR_KEYS", ",", ANVIL_VALIDATORS);
        // we don't validate the contents of the keys because vm.addr will throw if they are invalid
        require(validators.length == 3, "Modify this script to support validators.length other than 3");
        stakers = vm.envOr("INTEGRATION_STAKERS", ",", ANVIL_STAKERS);
        require(stakers.length == 7, "Modify this script to support stakers.length other than 7");
        contractDeployer = vm.envOr("INTEGRATION_CONTRACT_DEPLOYER", ANVIL_CONTRACT_DEPLOYER);
        nstDepositor = vm.envOr("INTEGRATION_NST_DEPOSITOR", ANVIL_NST_DEPOSITOR);

        // read the network configuration parameters and validate them
        depositContractAddress =
            vm.envOr("INTEGRATION_DEPOSIT_CONTRACT_ADDRESS", address(0x00000000219ab540356cBB839Cbe05303d7705Fa));
        require(depositContractAddress != address(0), "Deposit contract address must be set");
        denebTimestamp = vm.envUint("INTEGRATION_DENEB_TIMESTAMP");
        require(denebTimestamp > 0, "Deneb timestamp must be set");
        pectraTimestamp = vm.envUint("INTEGRATION_PECTRA_TIMESTAMP");
        require(pectraTimestamp > 0, "Pectra timestamp must be set");
        beaconGenesisTimestamp = vm.envUint("INTEGRATION_BEACON_GENESIS_TIMESTAMP");
        require(beaconGenesisTimestamp > 0, "Beacon genesis timestamp must be set");
        // can not read uint64 from env
        uint256 secondsPerSlot_ = vm.envUint("INTEGRATION_SECONDS_PER_SLOT");
        require(secondsPerSlot_ > 0, "Seconds per slot must be set");
        require(secondsPerSlot_ <= type(uint64).max, "Seconds per slot must be less than or equal to uint64 max");
        secondsPerSlot = uint64(secondsPerSlot_);
        uint256 slotsPerEpoch_ = vm.envUint("INTEGRATION_SLOTS_PER_EPOCH");
        require(slotsPerEpoch_ > 0, "Slots per epoch must be set");
        require(slotsPerEpoch_ <= type(uint64).max, "Slots per epoch must be less than or equal to uint64 max");
        slotsPerEpoch = uint64(slotsPerEpoch_);
        // then, the Ethereum-native validator configuration
        // mnemonic used is `test test test test test test test test test test test junk`
        pubkey = vm.envOr(
            "INTEGRATION_PUBKEY",
            hex"a39882700ed7f72fcdbac07081b7c0c912cb8647ed8494926e6c9c2fc1a7415c7c60e3afcc3d3278fe25b50b851c3ad5"
        );
        require(pubkey.length == 48, "Pubkey must be 48 bytes");
        signature = vm.envOr(
            "INTEGRATION_SIGNATURE",
            hex"b6ee40926b9f7e569ae9cc03890b79d5884bc89a85c53b2537eb6766a086a9e4a4ad52e820089c794c2d531305ae252e15a3ed378e34da3aa0eaeb0d83510f48df0239665121e140577ddb7aa2b50da3fa03ea544302a6dd03fb321b8a7da443"
        );
        require(signature.length == 96, "Signature must be 96 bytes");
        depositDataRoot = vm.envOr(
            "INTEGRATION_DEPOSIT_DATA_ROOT", bytes32(0x21639c4cde63b1c6fd45579a0c4fb97752e93d8388d7627a0c5dd1bb437f6cfc)
        );
        require(depositDataRoot != bytes32(0), "Deposit data root must be set");
        // the last step is the salt for contract deployment
        salt = vm.envOr("INTEGRATION_SALT", bytes32(0));
        // a salt of 0 is acceptable
    }

    // use create2 to deploy create3, if required
    function deployCreate3() private {
        address create2 = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
        vm.assertEq(
            create2.code,
            hex"7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3",
            "Create2 code mismatch"
        );
        address create3 = address(CREATE3_FACTORY);
        bytes memory existingCode = create3.code;
        if (existingCode.length > 0) {
            vm.assertEq(
                existingCode,
                hex"6080604052600436106100295760003560e01c806350f1c4641461002e578063cdcb760a14610077575b600080fd5b34801561003a57600080fd5b5061004e610049366004610489565b61008a565b60405173ffffffffffffffffffffffffffffffffffffffff909116815260200160405180910390f35b61004e6100853660046104fd565b6100ee565b6040517fffffffffffffffffffffffffffffffffffffffff000000000000000000000000606084901b166020820152603481018290526000906054016040516020818303038152906040528051906020012091506100e78261014c565b9392505050565b6040517fffffffffffffffffffffffffffffffffffffffff0000000000000000000000003360601b166020820152603481018390526000906054016040516020818303038152906040528051906020012092506100e78383346102b2565b604080518082018252601081527f67363d3d37363d34f03d5260086018f30000000000000000000000000000000060209182015290517fff00000000000000000000000000000000000000000000000000000000000000918101919091527fffffffffffffffffffffffffffffffffffffffff0000000000000000000000003060601b166021820152603581018290527f21c35dbe1b344a2488cf3321d6ce542f8e9f305544ff09e4993a62319a497c1f60558201526000908190610228906075015b6040516020818303038152906040528051906020012090565b6040517fd69400000000000000000000000000000000000000000000000000000000000060208201527fffffffffffffffffffffffffffffffffffffffff000000000000000000000000606083901b1660228201527f010000000000000000000000000000000000000000000000000000000000000060368201529091506100e79060370161020f565b6000806040518060400160405280601081526020017f67363d3d37363d34f03d5260086018f30000000000000000000000000000000081525090506000858251602084016000f5905073ffffffffffffffffffffffffffffffffffffffff811661037d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601160248201527f4445504c4f594d454e545f4641494c454400000000000000000000000000000060448201526064015b60405180910390fd5b6103868661014c565b925060008173ffffffffffffffffffffffffffffffffffffffff1685876040516103b091906105d6565b60006040518083038185875af1925050503d80600081146103ed576040519150601f19603f3d011682016040523d82523d6000602084013e6103f2565b606091505b50509050808015610419575073ffffffffffffffffffffffffffffffffffffffff84163b15155b61047f576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601560248201527f494e495449414c495a4154494f4e5f4641494c454400000000000000000000006044820152606401610374565b5050509392505050565b6000806040838503121561049c57600080fd5b823573ffffffffffffffffffffffffffffffffffffffff811681146104c057600080fd5b946020939093013593505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6000806040838503121561051057600080fd5b82359150602083013567ffffffffffffffff8082111561052f57600080fd5b818501915085601f83011261054357600080fd5b813581811115610555576105556104ce565b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0908116603f0116810190838211818310171561059b5761059b6104ce565b816040528281528860208487010111156105b457600080fd5b8260208601602083013760006020848301015280955050505050509250929050565b6000825160005b818110156105f757602081860181015185830152016105dd565b50600092019182525091905056fea2646970667358221220fd377c185926b3110b7e8a544f897646caf36a0e82b2629de851045e2a5f937764736f6c63430008100033",
                "Create3 factory code mismatch"
            );
            return;
        }
        bytes32 localSalt = bytes32(0);
        vm.startBroadcast(contractDeployer);
        (bool success,) = create2.call(
            abi.encodePacked(
                localSalt,
                hex"608060405234801561001057600080fd5b5061063b806100206000396000f3fe6080604052600436106100295760003560e01c806350f1c4641461002e578063cdcb760a14610077575b600080fd5b34801561003a57600080fd5b5061004e610049366004610489565b61008a565b60405173ffffffffffffffffffffffffffffffffffffffff909116815260200160405180910390f35b61004e6100853660046104fd565b6100ee565b6040517fffffffffffffffffffffffffffffffffffffffff000000000000000000000000606084901b166020820152603481018290526000906054016040516020818303038152906040528051906020012091506100e78261014c565b9392505050565b6040517fffffffffffffffffffffffffffffffffffffffff0000000000000000000000003360601b166020820152603481018390526000906054016040516020818303038152906040528051906020012092506100e78383346102b2565b604080518082018252601081527f67363d3d37363d34f03d5260086018f30000000000000000000000000000000060209182015290517fff00000000000000000000000000000000000000000000000000000000000000918101919091527fffffffffffffffffffffffffffffffffffffffff0000000000000000000000003060601b166021820152603581018290527f21c35dbe1b344a2488cf3321d6ce542f8e9f305544ff09e4993a62319a497c1f60558201526000908190610228906075015b6040516020818303038152906040528051906020012090565b6040517fd69400000000000000000000000000000000000000000000000000000000000060208201527fffffffffffffffffffffffffffffffffffffffff000000000000000000000000606083901b1660228201527f010000000000000000000000000000000000000000000000000000000000000060368201529091506100e79060370161020f565b6000806040518060400160405280601081526020017f67363d3d37363d34f03d5260086018f30000000000000000000000000000000081525090506000858251602084016000f5905073ffffffffffffffffffffffffffffffffffffffff811661037d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601160248201527f4445504c4f594d454e545f4641494c454400000000000000000000000000000060448201526064015b60405180910390fd5b6103868661014c565b925060008173ffffffffffffffffffffffffffffffffffffffff1685876040516103b091906105d6565b60006040518083038185875af1925050503d80600081146103ed576040519150601f19603f3d011682016040523d82523d6000602084013e6103f2565b606091505b50509050808015610419575073ffffffffffffffffffffffffffffffffffffffff84163b15155b61047f576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601560248201527f494e495449414c495a4154494f4e5f4641494c454400000000000000000000006044820152606401610374565b5050509392505050565b6000806040838503121561049c57600080fd5b823573ffffffffffffffffffffffffffffffffffffffff811681146104c057600080fd5b946020939093013593505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6000806040838503121561051057600080fd5b82359150602083013567ffffffffffffffff8082111561052f57600080fd5b818501915085601f83011261054357600080fd5b813581811115610555576105556104ce565b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0908116603f0116810190838211818310171561059b5761059b6104ce565b816040528281528860208487010111156105b457600080fd5b8260208601602083013760006020848301015280955050505050509250929050565b6000825160005b818110156105f757602081860181015185830152016105dd565b50600092019182525091905056fea2646970667358221220fd377c185926b3110b7e8a544f897646caf36a0e82b2629de851045e2a5f937764736f6c63430008100033"
            )
        );
        require(success, "failed to deploy create3 factory");
        vm.stopBroadcast();
    }

    function deployContract() private {
        // check if contract is already deployed
        address computed = CREATE3_FACTORY.getDeployed(vm.addr(contractDeployer), salt);
        if (computed.code.length > 0) {
            console.log("Bootstrap contract already deployed", computed);
            bootstrap = Bootstrap(computed);
            return;
        }
        console.log("Deploying Bootstrap contract");
        vm.startBroadcast(contractDeployer);
        networkConfig = new NetworkConfig(
            depositContractAddress,
            denebTimestamp,
            slotsPerEpoch,
            secondsPerSlot,
            beaconGenesisTimestamp,
            pectraTimestamp
        );
        beaconOracle = new BeaconOracle(address(networkConfig));

        /// deploy vault implementation contract, capsule implementation contract
        vaultImplementation = new Vault();
        capsuleImplementation = new ImuaCapsule(address(networkConfig));

        /// deploy the vault beacon and capsule beacon
        vaultBeacon = new UpgradeableBeacon(address(vaultImplementation));
        capsuleBeacon = new UpgradeableBeacon(address(capsuleImplementation));

        // deploy BeaconProxyBytecode
        beaconProxyBytecode = new BeaconProxyBytecode();

        proxyAdmin = new CustomProxyAdmin();
        EndpointV2Mock clientChainLzEndpoint = new EndpointV2Mock(clientChainId);

        // Create ImmutableConfig struct
        BootstrapStorage.ImmutableConfig memory config = BootstrapStorage.ImmutableConfig({
            imuachainChainId: imuachainChainId,
            beaconOracleAddress: address(beaconOracle),
            vaultBeacon: address(vaultBeacon),
            imuaCapsuleBeacon: address(capsuleBeacon),
            beaconProxyBytecode: address(beaconProxyBytecode),
            networkConfig: address(networkConfig)
        });

        Bootstrap bootstrapLogic = new Bootstrap(address(clientChainLzEndpoint), config);

        // the proxy is to be deployed via create3
        address[] memory whitelistTokens = new address[](1);
        whitelistTokens[0] = VIRTUAL_STAKED_ETH_ADDRESS;
        uint256[] memory tvlLimits = new uint256[](1);
        // not enforced for virtual staked eth, any value works
        tvlLimits[0] = type(uint256).max;

        // bootstrap proxy, it should be deployed using CREATE3
        bytes memory bootstrapInit = abi.encodeCall(
            Bootstrap.initialize,
            (
                vm.addr(contractDeployer),
                block.timestamp + 24 hours,
                1 seconds,
                whitelistTokens,
                tvlLimits,
                address(proxyAdmin),
                // not needed for creating the contract
                address(0x1),
                bytes("123456")
            )
        );
        bytes memory creationCode = abi.encodePacked(
            type(TransparentUpgradeableProxy).creationCode,
            abi.encode(address(bootstrapLogic), address(proxyAdmin), bootstrapInit)
        );
        bootstrap = Bootstrap(payable(CREATE3_FACTORY.deploy(salt, creationCode)));

        proxyAdmin.initialize(address(bootstrap));
        rewardVaultImplementation = new RewardVault();
        rewardVaultBeacon = new UpgradeableBeacon(address(rewardVaultImplementation));
        ClientChainGateway clientGatewayLogic =
            new ClientChainGateway(address(clientChainLzEndpoint), config, address(rewardVaultBeacon));

        bytes memory initialization =
            abi.encodeWithSelector(clientGatewayLogic.initialize.selector, vm.addr(contractDeployer));

        bootstrap.setClientChainGatewayLogic(address(clientGatewayLogic), initialization);

        vm.stopBroadcast();
    }

    function stakeNST() private {
        vm.startBroadcast(nstDepositor);
        address myAddress = address(bootstrap.ownerToCapsule(vm.addr(nstDepositor)));
        if (myAddress == address(0)) {
            myAddress = bootstrap.createImuaCapsule();
        }
        console.log("ImuaCapsule address", myAddress);
        console.log("pubkey");
        console.logBytes(pubkey);
        console.log("signature");
        console.logBytes(signature);
        console.log("depositDataRoot");
        console.logBytes32(depositDataRoot);
        // bootstrap.stake{value: 32 ether}(pubkey, signature, depositDataRoot);
        vm.stopBroadcast();
    }

    function registerValidators() private {
        string[3] memory ims = [
            // these addresses will accrue rewards but they are not needed to keep the chain
            // running.
            "im13hasr43vvq8v44xpzh0l6yuym4kca98fhq3xla",
            "im1wnw7zcl9fy04ax69uffumwkdxftfqsjyz0akf0",
            "im1rtg0cgw94ep744epyvanc0wdd5kedwqlw008ex"
        ];
        string[3] memory names = ["validator1", "validator2", "validator3"];
        // the mnemonics corresponding to the consensus public keys are given here. to recover,
        // echo "${MNEMONIC}" | imuad init localnet --chain-id imuachainlocalnet_232-1 --recover
        // the value in this script is this one
        // imuad keys consensus-pubkey-to-bytes --output json | jq -r .bytes
        bytes32[3] memory pubKeys = [
            // wonder quality resource ketchup occur stadium vicious output situate plug second
            // monkey harbor vanish then myself primary feed earth story real soccer shove like
            bytes32(0xF0F6919E522C5B97DB2C8255BFF743F9DFDDD7AD9FC37CB0C1670B480D0F9914),
            // carpet stem melt shove boring monster group hover afraid impulse give human
            // blanket notable repeat typical image menu know resist injury trick cancel robot
            bytes32(0x5CBB4508AD3F9C1D711314971211F991AC51B5EDDA2174866817D649E34EB691),
            // sugar vault poet soda excite puzzle news stool bonus harsh middle forget mosquito
            // wise sister language work muscle parade dad angry across emerge trade
            bytes32(0x4C9DE94E1F3225906602AE812E30F1BE56427126D60F2F6CB661B7F4FDA638DC)
        ];
        IValidatorRegistry.Commission memory commission = IValidatorRegistry.Commission(0, 1e18, 1e18);
        for (uint256 i = 0; i < validators.length; i++) {
            vm.startBroadcast(validators[i]);
            bootstrap.registerValidator(ims[i], names[i], commission, pubKeys[i]);
            vm.stopBroadcast();
        }
    }

    function run() external {
        console.log("Loading keys and addresses");
        setUp();
        console.log("Set up complete");
        console.log("Deploying create3 factory");
        deployCreate3();
        console.log("Create3 factory deployed");
        console.log("Deploying contract");
        deployContract();
        console.log("Contract deployed");
        console.log("Staking NST");
        stakeNST();
        console.log("Staked NST (will have to submit proof later to count the deposit)");
        registerValidators();
        console.log("Validators registered");
        // finally save the bootstrap address
        string memory key = "deployments";
        key.serialize("beaconOracleAddress", address(beaconOracle));
        string memory start = key.serialize("bootstrapAddress", address(bootstrap));
        vm.writeFile("script/deployments.json", start);
    }

    // Helper function to generate a random number within a range
    function random(uint256 _range) internal view returns (uint256) {
        // Basic random number generation; consider a more robust approach for production
        return (uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % (_range - 1)) + 1;
    }
}
