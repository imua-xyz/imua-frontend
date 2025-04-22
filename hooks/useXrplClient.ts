import { useContext } from "react";
import { XrpClientContext } from "@/types/xrpClientContext";

export const useXrplClient = () => useContext(XrpClientContext);
