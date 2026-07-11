/**
 * 프로젝트 기본 정책: stub ON + viewport LOD.
 * 라이브 API가 필요할 때만 API_STUB_MODE=false 로 설정 (서버·클라이언트 동일).
 */
export { isApiStubMode } from "@/lib/serverEnv";
export { isClientApiStubMode } from "@/lib/runtimeConfig.client";
