
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { normalizeImageURL } from "../lib/image-url";
import styles from "./page.module.css";

const API_BASE_URL = "https://watchymcwatchface-backend.vercel.app";

const streamingServices = [
  "Netflix",
  "Hulu",
  "Disney+",
  "HBO Max",
  "Amazon Prime Video",
  "Peacock",
  "Paramount+",
  "Apple TV",
  "fuboTV",
  "Crunchyroll",
];

type Movie = {
  id: string;
  name: string;
  imgURL: string;
  genre: string;
  services: string[];
};

type HomeCategory = {
  genre: string;
  items: Movie[];
};

function normalizeService(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const service = value as Record<string, unknown>;
  const name =
    service.serviceName ??
    service.name ??
    service.provider ??
    service.service;
  return typeof name === "string" ? name.trim() : "";
}

function normalizeServiceName(value: string): string {
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    "amazon prime video": "prime video",
    "apple tv store": "apple tv",
    "apple tv+": "apple tv",
    "hbo max": "max",
  };
  return aliases[normalized] ?? normalized;
}

function normalizeMovie(
  item: any,
  genre = "",
  index = 0
): Movie {
  const image =
    item.imgURL ??
    item.posterUrl ??
    item.poster_url ??
    item.poster ??
    item.imageUrl ??
    item.image ??
    item.thumbnail;
  const serviceData =
    item.streamingServices ??
    item.streaming_services ??
    item.streamingLinks ??
    item.streaming_links ??
    item.providers ??
    item.services;

  return {
    id: String(
      item.id ?? item._id ?? `${genre}-${item.name ?? "movie"}-${index}`
    ),
    name: String(item.name ?? item.title ?? ""),
    imgURL: normalizeImageURL(image),
    genre: String(item.genre ?? genre),
    services: Array.isArray(serviceData)
      ? serviceData
          .map(normalizeService)
          .filter(Boolean)
      : typeof serviceData === "string"
        ? serviceData
            .split(",")
            .map((service: string) => service.trim())
            .filter(Boolean)
        : [],
  };
}

function normalizeHomeCategories(data: any): HomeCategory[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter(
      (category: any) =>
        category &&
        typeof category.genre === "string" &&
        Array.isArray(category.items)
    )
    .map((category: any, categoryIndex: number) => ({
      genre:
        category.genre.trim().toLowerCase() === "staff"
          ? "Staff Recommendation"
          : category.genre,
      items: category.items
        .filter((item: any) => item && typeof item === "object")
        .map((item: any, index: number) =>
          normalizeMovie(
            item,
            category.genre,
            categoryIndex * 1000 + index
          )
        )
        .filter((movie: Movie) => movie.name !== ""),
    }));
}

function normalizeSearchResults(data: any): Movie[] {
  const records = Array.isArray(data)
    ? data
    : Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.movies)
            ? data.movies
            : [];

  return records
    .filter((item: any) => item && typeof item === "object")
    .map((item: any, index: number) =>
      normalizeMovie(item, "", index)
    )
    .filter((movie: Movie) => movie.name !== "");
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [searchSubmitVersion, setSearchSubmitVersion] = useState(0);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [homeCategories, setHomeCategories] = useState<HomeCategory[]>([]);
  const [failedPosterIds, setFailedPosterIds] = useState<Set<string>>(
    () => new Set()
  );

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [appliedServices, setAppliedServices] = useState<string[]>([]);
  const [movieServices, setMovieServices] = useState<
    Record<string, string[]>
  >({});
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceError, setServiceError] = useState("");

  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  const [loadingHome, setLoadingHome] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [homeError, setHomeError] = useState("");
  const [searchError, setSearchError] = useState("");

  const query = search.trim();
  const requestQuery =
    query.toLowerCase() === "et" ? "E.T." : query;
  const hasSearch = query.length >= 3 || query.toLowerCase() === "et";
  const handledSearchSubmitVersion = useRef(0);

  // Load Action and Comedy categories from the backend.
  useEffect(() => {
    const controller = new AbortController();

    async function loadHomeMovies() {
      setLoadingHome(true);
      setHomeError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/homePageItems`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Could not load homepage movies (${response.status}).`
          );
        }

        const data = await response.json();

        console.log("Homepage API response:", data);

        const categories = normalizeHomeCategories(data);

        console.log("Normalized homepage categories:", categories);

        setHomeCategories(categories);

        if (categories.length === 0) {
          setHomeError(
            "No homepage categories were returned in the expected format."
          );
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Error loading homepage movies:", error);

        setHomeError(
          error instanceof Error
            ? error.message
            : "Unable to load homepage movies."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingHome(false);
        }
      }
    }

    loadHomeMovies();

    return () => controller.abort();
  }, []);

  // Show the welcome popup only on the first visit.
  useEffect(() => {
    try {
      if (!localStorage.getItem("watchyWelcomeSeen")) {
        setWelcomeOpen(true);
      }
    } catch (error) {
      console.error("Could not check welcome popup setting:", error);
    }
  }, []);

  useEffect(() => {
    function closeFilterOnOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !filterRef.current?.contains(event.target)
      ) {
        setFilterOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeFilterOnOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", closeFilterOnOutsideClick);
  }, []);

  function closeWelcomePopup() {
    setWelcomeOpen(false);

    try {
      localStorage.setItem("watchyWelcomeSeen", "true");
    } catch (error) {
      console.error("Could not save welcome popup setting:", error);
    }
  }

  // Search the backend after the user stops typing for 300 milliseconds.
  useEffect(() => {
    if (!hasSearch) {
      setSearchResults([]);
      setSearchError("");
      setLoadingSearch(false);
      return;
    }

    const controller = new AbortController();
    const submitted = searchSubmitVersion > handledSearchSubmitVersion.current;
    handledSearchSubmitVersion.current = searchSubmitVersion;

    const timeout = setTimeout(async () => {
      setLoadingSearch(true);
      setSearchError("");

      try {
        const url =
          `${API_BASE_URL}/searchForItem/?name=` +
          encodeURIComponent(requestQuery);

        console.log("Searching API:", url);

        const response = await fetch(url, {
          signal: controller.signal,
          cache: "no-store",
        });

        const data = await response.json();

        console.log("Raw search API response:", data);

        if (!response.ok) {
          throw new Error(
            data?.message ??
              `Search failed with status ${response.status}.`
          );
        }

        const movies = normalizeSearchResults(data);

        console.log("Normalized search results:", movies);

        setSearchResults(movies);

        if (movies.length === 0) {
          setSearchError(
            "No results found. Try another movie or TV show."
          );
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Movie search error:", error);

        setSearchResults([]);

        setSearchError(
          error instanceof Error
            ? error.message
            : "Something went wrong while searching."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSearch(false);
        }
      }
    }, submitted ? 0 : 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [hasSearch, query, requestQuery, searchSubmitVersion]);

  function toggleService(service: string) {
    setSelectedServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service]
    );
  }

  function applyFilters() {
    setAppliedServices(selectedServices);
    setFilterOpen(false);
  }

  function clearFilters() {
    setSelectedServices([]);
    setAppliedServices([]);
    setServiceError("");
    setLoadingServices(false);
  }

  function matchesServices(movie: Movie) {
    if (appliedServices.length === 0) {
      return true;
    }

    return appliedServices.some((selected) =>
      (movie.services.length > 0
        ? movie.services
        : movieServices[movie.name.toLowerCase()] ?? []
      ).some(
        (service) =>
          normalizeServiceName(service) === normalizeServiceName(selected)
      )
    );
  }

  // Render posters directly from the online imgURL field.
  function renderMovie(movie: Movie) {
    const posterFailed = failedPosterIds.has(movie.id);

    return (
      <div className={styles.movieItem} key={movie.id}>
        <Link
          href={`/movies/${encodeURIComponent(movie.id)}?name=${encodeURIComponent(
            movie.name
          )}`}
          className={styles.movieLink}
          title={movie.name}
        >
          {movie.imgURL && !posterFailed ? (
            <img
              src={movie.imgURL}
              alt={`${movie.name} poster`}
              className={styles.moviePoster}
              loading="lazy"
              onError={(event) => {
                console.error(
                  `Could not load image for "${movie.name}":`,
                  movie.imgURL
                );
                setFailedPosterIds((current) => {
                  if (current.has(movie.id)) {
                    return current;
                  }

                  const failed = new Set(current);
                  failed.add(movie.id);
                  return failed;
                });
              }}
            />
          ) : (
            <div
              className={styles.moviePosterFallback}
              role="img"
              aria-label={`${movie.name} poster unavailable`}
            >
              <svg
                className={styles.posterFallbackIcon}
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="7" y="7" width="34" height="34" rx="4" />
                <path d="M15 7v34m18-34v34M7 17h8m18 0h8M7 31h8m18 0h8" />
              </svg>
              <span className={styles.posterFallbackTitle}>{movie.name}</span>
              <span className={styles.posterFallbackLabel}>
                Poster unavailable
              </span>
            </div>
          )}

          <p>{movie.name}</p>
        </Link>
      </div>
    );
  }

  function renderCategory(category: HomeCategory) {
    const visibleMovies = category.items.filter(matchesServices);

    return (
      <section className={styles.category} key={category.genre}>
        <h2>{category.genre}</h2>

        {visibleMovies.length > 0 ? (
          <div className={styles.list}>
            {visibleMovies.map(renderMovie)}
          </div>
        ) : (
          <p>
            {loadingHome
              ? "Loading movies..."
              : loadingServices && appliedServices.length > 0
                ? "Checking streaming availability..."
                : appliedServices.length > 0
                  ? "No movies in this category match your selected services."
                  : `No movies found in ${category.genre}.`}
          </p>
        )}
      </section>
    );
  }

  const visibleSearchResults = searchResults.filter(matchesServices);

  const actionCategory = homeCategories.find(
    (category) => category.genre.trim().toLowerCase() === "action"
  );

  const comedyCategory = homeCategories.find(
    (category) => category.genre.trim().toLowerCase() === "comedy"
  );

  const staffRecommendationCategory = homeCategories.find(
    (category) =>
      category.genre.trim().toLowerCase() === "staff recommendation"
  );

  const displayedHomeCategories = [
    staffRecommendationCategory,
    actionCategory,
    comedyCategory,
  ].filter((category): category is HomeCategory => Boolean(category));

  useEffect(() => {
    if (appliedServices.length === 0) {
      return;
    }

    const movies = hasSearch
      ? searchResults
      : homeCategories
          .filter((category) =>
            ["action", "comedy", "staff", "staff recommendation"].includes(
              category.genre.trim().toLowerCase()
            )
          )
          .flatMap((category) => category.items);
    const uniqueMovies = Array.from(
      new Map(
        movies.map((movie) => [movie.name.toLowerCase(), movie])
      ).values()
    );
    const moviesNeedingServices = uniqueMovies.filter(
      (movie) =>
        movie.services.length === 0 &&
        movieServices[movie.name.toLowerCase()] === undefined
    );

    if (moviesNeedingServices.length === 0) {
      return;
    }

    const controller = new AbortController();

    async function loadMovieServices() {
      setLoadingServices(true);
      setServiceError("");

      try {
        const services = await Promise.all(
          moviesNeedingServices.map(async (movie) => {
            const response = await fetch(
              `${API_BASE_URL}/getItemInformation?name=${encodeURIComponent(
                movie.name
              )}`,
              {
                signal: controller.signal,
                cache: "no-store",
              }
            );
            const data = await response.json();

            if (!response.ok) {
              throw new Error(
                data?.message ??
                  `Could not load streaming availability for ${movie.name}.`
              );
            }

            const [details] = normalizeSearchResults([data]);
            if (!details) {
              throw new Error(
                `Could not load streaming availability for ${movie.name}.`
              );
            }

            return [movie.name.toLowerCase(), details.services] as const;
          })
        );

        setMovieServices((current) => ({
          ...current,
          ...Object.fromEntries(services),
        }));
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Movie streaming availability lookup failed:", error);
        setServiceError(
          error instanceof Error
            ? error.message
            : "Unable to load streaming availability."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingServices(false);
        }
      }
    }

    loadMovieServices();

    return () => controller.abort();
  }, [
    appliedServices,
    homeCategories,
    hasSearch,
    movieServices,
    searchResults,
  ]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <h1>WatchyMcWatchFace</h1>
        </div>

        <form
          className={styles.searchForm}
          onSubmit={(event) => {
            event.preventDefault();
            setSearchSubmitVersion((version) => version + 1);
          }}
        >
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search movies and TV shows..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search movies and TV shows"
          />

          {search && (
            <button
              type="button"
              className={styles.clearSearchButton}
              onClick={() => setSearch("")}
              aria-label="Clear search"
              title="Clear search"
            >
              ×
            </button>
          )}

          <button type="submit" className={styles.searchButton}>
            Search
          </button>
        </form>

        <div className={styles.filter} ref={filterRef}>
          <button
            type="button"
            className={styles.filterButton}
            onClick={() => setFilterOpen((open) => !open)}
            aria-expanded={filterOpen}
          >
            Streaming Services
            <span className={styles.arrow}>
              {filterOpen ? "▲" : "▼"}
            </span>
          </button>

          {filterOpen && (
            <div className={styles.filterPopup}>
              <div className={styles.filterOptions}>
                {streamingServices.map((service) => (
                  <label
                    className={styles.filterOption}
                    key={service}
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(service)}
                      onChange={() => toggleService(service)}
                    />
                    {service}
                  </label>
                ))}
              </div>

              <button
                type="button"
                className={styles.applyFilter}
                onClick={applyFilters}
              >
                Apply Filters
              </button>

              <button
                type="button"
                className={styles.clearFilter}
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={styles.body}>
        {appliedServices.length > 0 && (
          <p className={styles.searchMessage}>
            Filtering by: {appliedServices.join(", ")}
          </p>
        )}

        {serviceError && (
          <p className={styles.searchMessage} role="alert">
            {serviceError}
          </p>
        )}

        {hasSearch ? (
          <section className={styles.category}>
            <h2>Search Results</h2>

            {loadingSearch && (
              <p className={styles.searchMessage}>
                Searching for movies and TV shows...
              </p>
            )}

            {!loadingSearch &&
              loadingServices &&
              appliedServices.length > 0 && (
                <p className={styles.searchMessage}>
                  Checking streaming availability...
                </p>
              )}

            {!loadingSearch && searchError && (
              <p className={styles.searchMessage}>{searchError}</p>
            )}

            {!loadingSearch &&
              !loadingServices &&
              !searchError &&
              visibleSearchResults.length === 0 && (
                <p className={styles.searchMessage}>
                  No results match your selected streaming services.
                </p>
              )}

            {visibleSearchResults.length > 0 && (
              <div className={styles.list}>
                {visibleSearchResults.map(renderMovie)}
              </div>
            )}
          </section>
        ) : (
          <>
            {homeError && (
              <p className={styles.searchMessage}>{homeError}</p>
            )}

            {loadingHome && homeCategories.length === 0 && (
              <p className={styles.searchMessage}>
                Loading homepage movies...
              </p>
            )}

            {displayedHomeCategories.map(renderCategory)}

            {!loadingHome &&
              !homeError &&
              displayedHomeCategories.length === 0 && (
                <p className={styles.searchMessage}>
                  The API did not return Action and Comedy categories.
                  Check the genre values in the API response.
                </p>
              )}
          </>
        )}
      </div>

      {welcomeOpen && (
        <div className={styles.popupOverlay}>
          <div
            className={styles.welcomePopup}
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
          >
            <h2 id="welcome-title" className={styles.welcomeTitle}>
              Welcome to WatchyMcWatchFace
            </h2>

            <button
              type="button"
              className={styles.closePopup}
              onClick={closeWelcomePopup}
              aria-label="Close welcome popup"
            >
              ×
            </button>

            <div className={styles.popupLeft}>
              <div className={styles.popupLeftSection}>
                <h3>Who Are We</h3>
                <p>
                  We are just two people who want to help you find
                  your show.
                </p>
              </div>

              <div className={styles.popupLeftSection}>
                <h3>Why We Made This</h3>
                <p>
                  We made this to help people find any movie or TV
                  show easier to find.
                </p>
              </div>
            </div>

            <div className={styles.popupRight}>
              <div className={styles.popupRightSection}>
                <h3>What Our Website Does</h3>
                <p>
                  Users can search for any movie and/or TV show and
                  apply filters for their subscriptions to find out
                  what they can watch.
                </p>
              </div>

              <div className={styles.popupRightSection}>
                <h3>How It Works</h3>
                <p>
                  Search for a movie or TV show and the results will
                  appear. You can also filter by your streaming
                  subscriptions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
