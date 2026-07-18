"use client";

import { useCallback, useEffect, useState } from "react";
import { deriveInterestProfile } from "@/lib/interest/deriveInterestProfile";
import { getInterestStore } from "@/lib/interest/interestStore";
import { recommendFromInterest } from "@/lib/interest/recommendFromInterest";
import type {
  InterestProfile,
  InterestRecommendChip,
  InterestState,
} from "@/lib/interest/interestTypes";

function readProfile(): {
  state: InterestState;
  profile: InterestProfile;
  chips: InterestRecommendChip[];
} {
  const state = getInterestStore().load();
  const profile = deriveInterestProfile(state);
  const chips = recommendFromInterest(profile);
  return { state, profile, chips };
}

export function useInterestProfile() {
  const [profile, setProfile] = useState<InterestProfile>(() =>
    typeof window === "undefined"
      ? { buckets: [], topTheaters: [], topThemes: [], topSymbols: [], eventCount: 0 }
      : readProfile().profile,
  );
  const [chips, setChips] = useState<InterestRecommendChip[]>(() =>
    typeof window === "undefined" ? [] : readProfile().chips,
  );

  const refresh = useCallback(() => {
    const next = readProfile();
    setProfile(next.profile);
    setChips(next.chips);
  }, []);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener("cv-interest-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("cv-interest-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [refresh]);

  return { profile, chips, refresh };
}
