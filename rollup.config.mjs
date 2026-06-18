import resolve from "@rollup/plugin-node-resolve";
import { makeRollupConfig } from "@jspsych/config/rollup";

export default makeRollupConfig("jsPsychStorycollection").map((config) => {
  return {
    ...config,
    plugins: [
     ...config.plugins,
      resolve({
        extensions: [".js", ".jsx", ".ts"]
      }),
    ]
  };
});
