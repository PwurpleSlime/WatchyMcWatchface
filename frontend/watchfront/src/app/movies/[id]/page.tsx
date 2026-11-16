"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { normalizeImageURL } from "../../../lib/image-url";
import styles from "./page.module.css";

const API_BASE_URL = "https://watchymcwatchface-backend.vercel.app";

type StreamingService = {
  serviceName: string;
  DUB: string[];
  SUB: string[];
};

type Movie = {
  name: string;
  imgURL: string;
  synopsis: string;
  genre: string;
  services: StreamingService[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeMovie(data: unknown, requestedName: string): Movie {
  if (!isRecord(data)) {
    throw new Error("The API returned invalid movie details.");
  }

  const services = Array.isArray(data.services)
    ? data.services.filter(isRecord).map((service) => ({
        serviceName:
          typeof service.serviceName === "string"
            ? service.serviceName
            : "Streaming service",
        DUB: stringList(service.DUB),
        SUB: stringList(service.SUB),
      }))
    : [];

  return {
    name: typeof data.name === "string" ? data.name : requestedName,
    imgURL: normalizeImageURL(data.imgURL),
    synopsis: typeof data.synopsis === "string" ? data.synopsis : "",
    genre: typeof data.genre === "string" ? data.genre : "",
    services,
  };
}

function MovieDetails() {
  const searchParams = useSearchParams();
  const name = searchParams.get("name")?.trim() ?? "";
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!name) {
      return;
    }

    const controller = new AbortController();

    async function loadMovie() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/getItemInformation?name=${encodeURIComponent(name)}`,
          { signal: controller.signal, cache: "no-store" }
        );
        const data: unknown = await response.json();

        if (!response.ok) {
          const message =
            isRecord(data) && typeof data.message === "string"
              ? data.message
              : `Could not load movie details (${response.status}).`;
          throw new Error(message);
        }

        setMovie(normalizeMovie(data, name));
      } catch (requestError) {
        if (
          requestError instanceof Error &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load movie details."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadMovie();

    return () => controller.abort();
  }, [name]);

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
        {!name ? (
          <p className={styles.message}>
            Movie name was not provided. Please return to the main page.
          </p>
        ) : loading ? (
          <p className={styles.message} aria-live="polite">
            Loading movie details...
          </p>
        ) : error ? (
          <p className={styles.message} role="alert">
            {error}
          </p>
        ) : movie ? (
          <section className={styles.movieDetails}>
            <div className={styles.posterContainer}>
              {movie.imgURL ? (
                <img
                  className={styles.poster}
                  src={movie.imgURL}
                  alt={`${movie.name} poster`}
                />
              ) : (
                <div className={styles.posterPlaceholder}>
                  <span>Movie Poster</span>
                </div>
              )}
            </div>

            <div className={styles.movieInfo}>
              <h2 className={styles.movieTitle}>{movie.name}</h2>

              {movie.genre && <p>Genre: {movie.genre}</p>}

              <section className={styles.descriptionSection}>
                <h3>Synopsis</h3>
                <p className={styles.description}>
                  {movie.synopsis || "No synopsis is available."}
                </p>
              </section>

              <section className={styles.streamingSection}>
                <h3>Where to Watch</h3>

                {movie.services.length > 0 ? (
                  <div className={styles.streamingLinks}>
                    {movie.services.map((service, index) => (
                      <div
                        key={`${service.serviceName}-${index}`}
                        className={styles.streamingService}
                      >
                        <strong>{service.serviceName}</strong>
                        {service.DUB.length > 0 && (
                          <p>
                            Dubbing: {service.DUB.join(", ")}
                          </p>
                        )}
                        {service.SUB.length > 0 && (
                          <p>
                            Subtitles: {service.SUB.join(", ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.message}>
                    No streaming availability information is listed.
                  </p>
                )}
              </section>
            </div>
          </section>
        ) : (
          <p className={styles.message} role="alert">
            Movie details could not be loaded.
          </p>
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
            <p className={styles.message}>Loading movie details...</p>
          </main>
        </div>
      }
    >
      <MovieDetails />
    </Suspense>
  );
}
