import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <h1>WatchyMcWatchFace</h1>
        </div>
      </div>
    </div>
  );
}
