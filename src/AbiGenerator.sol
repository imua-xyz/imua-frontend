// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Bootstrap} from "imua-contracts/src/core/Bootstrap.sol";
import {ClientChainGateway} from "imua-contracts/src/core/ClientChainGateway.sol";
import {IAssets} from "imua-contracts/src/interfaces/precompiles/IAssets.sol";
import {UTXOGateway} from "imua-contracts/src/core/UTXOGateway.sol";
import {Vault} from "imua-contracts/src/core/Vault.sol";
import {ImuachainGateway} from "imua-contracts/src/core/ImuachainGateway.sol";
import {ImuaCapsule} from "imua-contracts/src/core/ImuaCapsule.sol";
import {EigenLayerBeaconOracle} from "imua-contracts/lib/eigenlayer-beacon-oracle/contracts/src/EigenLayerBeaconOracle.sol";

// blank contract to generate the ABIs
contract AbiGenerator {}
