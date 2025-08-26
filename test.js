const validatorAddress = "im13hasr43vvq8v44xpzh0l6yuym4kca98f87j7ac";
const utf8Bytes = Buffer.from(validatorAddress, "utf8");
console.log(utf8Bytes.toString("hex"));
