"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import styles from "./page.module.css";

type StreamingLink = {
  name: string;
  url: string;
};

type Movie = {
  id: string;
  title: string;
  posterUrl: string;
  description: string;
  streamingLinks: StreamingLink[];
};

// Temporary example data.
// These IDs must match the IDs used on the home page.
const exampleMovies: Movie[] = [
  {
    id: "example-movie",
    title: "Example Movie",
    posterUrl: "/posters/example-movie.jpg",
    description:
      "Details for this example movie will appear here.",
    streamingLinks: [],
  },
  {
    id: "action-movie-2",
    title: "Action Movie 2",
    posterUrl: "/posters/action-movie-2.jpg",
    description:
      "Details for this action movie will appear here.",
    streamingLinks: [],
  },
  {
    id: "action-movie-3",
    title: "Action Movie 3",
    posterUrl: "/posters/action-movie-3.jpg",
    description:
      "Details for this action movie will appear here.",
    streamingLinks: [],
  },
  {
    id: "scifi-movie-1",
    title: "Science Fiction Movie 1",
    posterUrl: "/posters/scifi-movie-1.jpg",
    description:
      "Details for this science fiction movie will appear here.",
    streamingLinks: [],
  },
  {
    id: "scifi-movie-2",
    title: "Science Fiction Movie 2",
    posterUrl: "/posters/scifi-movie-2.jpg",
    description:
      "Details for this science fiction movie will appear here.",
    streamingLinks: [],
  },
  {
    id: "scifi-movie-3",
    title: "Science Fiction Movie 3",
    posterUrl: "/posters/scifi-movie-3.jpg",
    description:
      "Details for this science fiction movie will appear here.",
    streamingLinks: [],
  },
  {
    id: "comedy-movie-1",
    title: "Comedy Movie 1",
    posterUrl: "/posters/comedy-movie-1.jpg",
    description:
      "Details for this comedy movie will appear here.",
    streamingLinks: [],
  },
  {
    id: "comedy-movie-2",
    title: "Comedy Movie 2",
    posterUrl: "/posters/comedy-movie-2.jpg",
    description:
      "Details for this comedy movie will appear here.",
    streamingLinks: [],
  },
  {
    id: "comedy-movie-3",
    title: "Comedy Movie 3",
    posterUrl: "/posters/comedy-movie-3.jpg",
    description:
      "Details for this comedy movie will appear here.",
    streamingLinks: [],
  },
];

function MovieDetails() {
  const params = useParams<{ id: string }>();

  const movie = exampleMovies.find(
    (item) => item.id === params.id
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link
          href="/"
          className={styles.backArrow}
          aria-label="Back to home"
          title="Back to home"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
            <path d="M9 12h12" />
          </svg>
        </Link>

        <div className={styles.logo}>
          <Link href="/" className={styles.logoLink}>
            <h1>WatchyMcWatchFace</h1>
          </Link>
        </div>
      </header>

      <main className={styles.content}>
        {!movie ? (
          <p className={styles.message}>
            Movie not found. Please return to the main page.
          </p>
        ) : (
          <section className={styles.movieDetails}>
            <div className={styles.posterContainer}>
              {movie.posterUrl ? (
                <img
                  className={styles.poster}
                  src={movie.posterUrl}
                  alt={`${movie.title} poster`}
                />
              ) : (
                <div className={styles.posterPlaceholder}>
                  <span>Movie Poster</span>
                </div>
              )}
            </div>

            <div className={styles.movieInfo}>
              <h2 className={styles.movieTitle}>
                {movie.title}
              </h2>

              <section className={styles.descriptionSection}>
                <h3>Description</h3>
                <p className={styles.description}>
                  {movie.description}
                </p>
              </section>

              <section className={styles.streamingSection}>
                <h3>Where to Watch</h3>

                {movie.streamingLinks.length > 0 ? (
                  <div className={styles.streamingLinks}>
                    {movie.streamingLinks.map((service) => (
                      <a
                        key={service.name}
                        href={service.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.streamingLink}
                      >
                        Watch on {service.name}
                        <span aria-hidden="true"> ↗</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className={styles.message}>
                    Streaming availability and links will
                    appear here once the backend is connected.
                  </p>
                )}
              </section>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function Movies() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <main className={styles.content}>
            <p className={styles.message}>
              Loading movie details...
            </p>
          </main>
        </div>
      }
    >
      <MovieDetails />
    </Suspense>
  );
}