import { GlobeBootLoader } from "@/components/GlobeBootLoader";
import { getRuntimeConfig } from "@/lib/serverEnv";
import { loadViinaRenderMeta } from "@/lib/viinaServerData";

export default function Home() {
  const viinaMeta = loadViinaRenderMeta();
  const runtimeConfig = getRuntimeConfig();
  return <GlobeBootLoader viinaMeta={viinaMeta} runtimeConfig={runtimeConfig} />;
}
