"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc
} from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase";
import { Sighting, SightingInput } from "@/lib/wildlife-types";

const COLLECTION_NAME = "wildlifeSightings";

type FirestoreSighting = SightingInput & {
  createdAt?: Timestamp | string | null;
};

function toIsoDate(value: FirestoreSighting["createdAt"]) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  return typeof value === "string" ? value : new Date().toISOString();
}

function toSighting(id: string, data: FirestoreSighting): Sighting {
  return {
    id,
    animal: data.animal,
    otherName: data.otherName,
    spottedAt: data.spottedAt,
    area: data.area,
    memo: data.memo,
    danger: data.danger,
    exterminationStatus: data.exterminationStatus,
    count: data.count,
    lat: data.lat,
    lng: data.lng,
    verified: data.verified,
    createdAt: toIsoDate(data.createdAt)
  };
}

export function trySubscribeToSharedSightings({
  onData,
  onError
}: {
  onData: (sightings: Sighting[]) => void;
  onError: (error: Error) => void;
}) {
  try {
    const { db } = getFirebaseServices();
    const sightingsQuery = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));

    return onSnapshot(
      sightingsQuery,
      (snapshot) => {
        onData(
          snapshot.docs.map((document) =>
            toSighting(document.id, document.data() as FirestoreSighting)
          )
        );
      },
      (error) => onError(error)
    );
  } catch (error) {
    onError(error instanceof Error ? error : new Error("Firestore is not available."));
    return null;
  }
}

export async function addSharedSighting(input: SightingInput) {
  const { db } = getFirebaseServices();
  const payload = {
    ...input,
    createdAt: serverTimestamp()
  };

  if (!payload.otherName) {
    delete payload.otherName;
  }

  const document = await addDoc(collection(db, COLLECTION_NAME), {
    ...payload
  });

  return document.id;
}

export async function updateSharedSightingExterminationStatus(
  id: string,
  exterminationStatus: Sighting["exterminationStatus"]
) {
  const { db } = getFirebaseServices();
  await updateDoc(doc(db, COLLECTION_NAME, id), {
    exterminationStatus
  });
}

export async function deleteSharedSighting(id: string) {
  const { db } = getFirebaseServices();
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}
