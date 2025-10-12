// hardhat.d.ts
import "hardhat/types/runtime";

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    ethers: any;
  }
}