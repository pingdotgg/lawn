"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useRef } from "react";

export function useUserSync() {
  const { user, isLoaded } = useUser();
  const syncUser = useMutation(api.users.syncUser);
  const lastSyncedUserIdRef = useRef<string | null>(null);
  const userId = user?.id ?? null;
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = user?.fullName || user?.username || "User";
  const avatarUrl = user?.imageUrl;

  useEffect(() => {
    if (!isLoaded || !userId) return;
    if (lastSyncedUserIdRef.current === userId) return;
    lastSyncedUserIdRef.current = userId;

    syncUser({
      clerkId: userId,
      email,
      name,
      avatarUrl,
    }).catch((error) => {
      lastSyncedUserIdRef.current = null;
      console.error(error);
    });
  }, [isLoaded, userId, email, name, avatarUrl, syncUser]);

  return { user, isLoaded };
}
