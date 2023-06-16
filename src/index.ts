import render from "./component";
import { pointers } from "./context";
import updateData, { subscribers } from "./data";

(window as any).change = {
  render,
  data: updateData,
  DEBUG: {
    subscribers,
    pointers,
  },
};
