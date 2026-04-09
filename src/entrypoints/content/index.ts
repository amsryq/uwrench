import { streamerModeFeature } from "../../lib/features/streamer-mode";
import { defineFeatureContentScript } from "./define-feature-content-script";

export default defineFeatureContentScript({
  matches: ["*://ufuture.uitm.edu.my/*"],
  features: [{ feature: streamerModeFeature }],
});
