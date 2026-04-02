import { useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useRoomStore } from "../store/room";
import { RoomSocket } from "../lib/ws";
import type { FibonacciValue } from "../../shared/types";
import CardGrid from "../components/CardGrid";
import ParticipantList from "../components/ParticipantList";
import RevealBoard from "../components/RevealBoard";
import StoryCard from "../components/StoryCard";
import AddStory from "../components/AddStory";
import styles from "./Room.module.css";

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const wsRef = useRef<RoomSocket | null>(null);

  const {
    connected,
    setConnected,
    room,
    participants,
    stories,
    revealed,
    estimates,
    consensus,
    myEstimate,
    setMyEstimate,
    handleMessage,
  } = useRoomStore();

  useEffect(() => {
    if (!roomId) return;

    const ws = new RoomSocket(roomId, handleMessage, setConnected);
    ws.connect();
    wsRef.current = ws;

    const storedName = localStorage.getItem("displayName") || "Anonymous";
    ws.send({ type: "join", displayName: storedName });

    return () => ws.close();
  }, [roomId]);

  const handleEstimate = useCallback(
    (value: FibonacciValue) => {
      setMyEstimate(value);
      wsRef.current?.send({ type: "estimate", value });
    },
    [setMyEstimate]
  );

  const handleReveal = useCallback(() => {
    wsRef.current?.send({ type: "reveal" });
  }, []);

  const handleReVote = useCallback(() => {
    wsRef.current?.send({ type: "re_vote" });
  }, []);

  const handleNextStory = useCallback(() => {
    wsRef.current?.send({ type: "next_story" });
  }, []);

  const handleAddStory = useCallback((title: string, description: string) => {
    wsRef.current?.send({ type: "add_story", title, description });
  }, []);

  const activeStory = stories.find((s) => s.status === "active") ?? null;
  const hasNextStory = stories.some((s) => s.status === "pending");

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.logo}>
          estimate<span className={styles.dot}>.</span>
        </h1>
        <div className={styles.roomInfo}>
          <span className={styles.code}>{roomId}</span>
        </div>
        <div
          className={`${styles.status} ${connected ? styles.online : styles.offline}`}
        >
          {connected ? "connected" : "reconnecting..."}
        </div>
      </header>

      <div className={styles.main}>
        <div className={styles.content}>
          <StoryCard story={activeStory} />
          <AddStory onAdd={handleAddStory} />

          {!revealed ? (
            <>
              <CardGrid
                selected={myEstimate}
                onSelect={handleEstimate}
                disabled={false}
              />
              <div className={styles.revealArea}>
                <button className={styles.revealBtn} onClick={handleReveal}>
                  Reveal Estimates
                </button>
              </div>
            </>
          ) : (
            <RevealBoard
              estimates={estimates}
              consensus={consensus}
              participants={participants}
              onReVote={handleReVote}
              onNextStory={handleNextStory}
              hasNextStory={hasNextStory}
            />
          )}
        </div>

        <ParticipantList participants={participants} />
      </div>
    </div>
  );
}
