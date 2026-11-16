
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  "Apple TV+",
];

type Movie = {
  id: string;
  title: string;
  posterUrl: string;
};

type MovieCategory = {
  name: string;
  movies: Movie[];
};

const categories: MovieCategory[] = [
  {
    name: "Action",
    movies: [
      {
        id: "example-movie",
        title: "Example Movie",
        posterUrl: "/next.svg",
      },
      {
        id: "action-movie-2",
        title: "Action Movie 2",
        posterUrl: "/vercel.svg",
      },
      {
        id: "action-movie-3",
        title: "Action Movie 3",
        posterUrl: "/window.svg",
      },
    ],
  },
  {
    name: "Science Fiction",
    movies: [
      {
        id: "scifi-movie-1",
        title: "Science Fiction Movie 1",
        posterUrl: "/globe.svg",
      },
      {
        id: "scifi-movie-2",
        title: "Science Fiction Movie 2",
        posterUrl: "/file.svg",
      },
      {
        id: "scifi-movie-3",
        title: "Science Fiction Movie 3",
        posterUrl: "/next.svg",
      },
    ],
  },
  {
    name: "Comedy",
    movies: [
      {
        id: "comedy-movie-1",
        title: "Comedy Movie 1",
        posterUrl: "/vercel.svg",
      },
      {
        id: "comedy-movie-2",
        title: "Comedy Movie 2",
        posterUrl: "/globe.svg",
      },
      {
        id: "comedy-movie-3",
        title: "Comedy Movie 3",
        posterUrl: "/window.svg",
      },
    ],
  },
];

// Converts common API response fields into the Movie format used by this page.
function normalizeMovies(data: unknown): Movie[] {
  let items: unknown[] = [];

  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === "object") {
    const response = data as Record<string, unknown>;

    if (Array.isArray(response.results)) {
      items = response.results;
    } else if (Array.isArray(response.items)) {
      items = response.items;
    } else if (Array.isArray(response.data)) {
      items = response.data;
    } else if (Array.isArray(response.movies)) {
      items = response.movies;
    }
  }

  return items
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null
    )
    .map((item, index) => {
      const title =
        item.title ??
        item.name ??
        item.original_title ??
        item.original_name;

      const id = item.id ?? item._id ?? item.imdbID ?? index;

      const poster =
        item.posterUrl ??
        item.poster_url ??
        item.poster ??
        item.imageUrl ??
        item.image ??
        item.thumbnail;

      return {
        id: String(id),
        title: typeof title === "string" ? title : "Untitled",
        posterUrl: typeof poster === "string" ? poster : "/next.svg",
      };
    });
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [showFilter, setShowFilter] = useState(false);

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const filterRef = useRef<HTMLDivElement>(null);

  // Search the API whenever the user types.
  useEffect(() => {
    const query = search.trim();

    if (!query) {
      setSearchResults([]);
      setIsLoading(false);
      setSearchError("");
      return;
    }

    let cancelled = false;

    const timeout = setTimeout(async () => {
      setIsLoading(true);
      setSearchError("");

      try {
        const url = `${API_BASE_URL}/searchForItem/?name=${encodeURIComponent(
          query
        )}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Search failed. Server returned status ${response.status}.`
          );
        }

        const data: unknown = await response.json();
        const movies = normalizeMovies(data);

        if (!cancelled) {
          setSearchResults(movies);
        }
      } catch (error) {
        if (!cancelled) {
          setSearchResults([]);
          setSearchError(
            error instanceof Error
              ? error.message
              : "Something went wrong while searching."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search]);

  // Show the welcome popup only if the user has not seen it before.
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("watchyWelcomeSeen");

    if (!hasSeenWelcome) {
      setShowWelcomePopup(true);
    }
  }, []);

  // Close the streaming service filter when clicking outside it.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setShowFilter(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // The API search already runs as the user types.
  }

  function toggleService(service: string) {
    setSelectedServices((previous) =>
      previous.includes(service)
        ? previous.filter((item) => item !== service)
        : [...previous, service]
    );
  }

  function applyFilter() {
    setActiveFilters([...selectedServices]);
    setShowFilter(false);
  }

  function clearFilters() {
    setSelectedServices([]);
    setActiveFilters([]);
  }

  function closeWelcomePopup() {
    localStorage.setItem("watchyWelcomeSeen", "true");
    setShowWelcomePopup(false);
  }

  // Keep the existing placeholder categories visible before a search.
  const filteredCategories = categories
    .map((category) => ({
      ...category,
      movies: category.movies.filter((movie) =>
        movie.title.toLowerCase().includes(search.trim().toLowerCase())
      ),
    }))
    .filter((category) => category.movies.length > 0);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <h1>WatchyMcWatchFace</h1>
        </div>

        <div className={styles.search}>
          <div className={styles.filter} ref={filterRef}>
            <button
              type="button"
              className={styles.filterButton}
              onClick={() => setShowFilter((previous) => !previous)}
              aria-expanded={showFilter}
              aria-haspopup="true"
            >
              Filter <span className={styles.arrow}>▾</span>
            </button>

            {showFilter && (
              <div className={styles.filterPopup}>
                <h3>Select Your Streaming Services</h3>

                <div className={styles.filterOptions}>
                  {streamingServices.map((service) => (
                    <label key={service} className={styles.filterOption}>
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service)}
                        onChange={() => toggleService(service)}
                      />
                      <span>{service}</span>
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  className={styles.applyFilter}
                  onClick={applyFilter}
                >
                  Apply Filters
                </button>

                <button
                  type="button"
                  className={styles.clearFilter}
                  onClick={clearFilters}
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>

          <form className={styles.searchForm} onSubmit={handleSearch}>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Search"
              aria-label="Search movies and TV shows"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button
              type="submit"
              className={styles.searchButton}
              aria-label="Search"
              title="Search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            </button>
          </form>
        </div>
      </header>

      <main className={styles.body}>
        {(search.trim() || activeFilters.length > 0) && (
          <p className={styles.searchMessage} role="status">
            {search.trim() && <>Search: {search.trim()} </>}

            {activeFilters.length > 0 && (
              <>Streaming Services: {activeFilters.join(", ")}</>
            )}
          </p>
        )}

        {search.trim() ? (
          <>
            {isLoading && (
              <p className={styles.searchMessage} role="status">
                Searching...
              </p>
            )}

            {searchError && !isLoading && (
              <p className={styles.searchMessage} role="alert">
                {searchError}
              </p>
            )}

            {!isLoading && !searchError && searchResults.length > 0 && (
              <section className={styles.category}>
                <h2>Search Results</h2>

                <div className={styles.list}>
                  {searchResults.map((movie) => (
                    <div key={movie.id} className={styles.movieItem}>
                      <Link
                        href={`/movies/${encodeURIComponent(movie.id)}`}
                        className={styles.movieLink}
                        aria-label={`View details for ${movie.title}`}
                      >
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className={styles.moviePoster}
                        />
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!isLoading &&
              !searchError &&
              searchResults.length === 0 && (
                <p className={styles.searchMessage} role="status">
                  No movies or TV shows found for &quot;{search}&quot;.
                </p>
              )}
          </>
        ) : (
          filteredCategories.map((category) => (
            <section className={styles.category} key={category.name}>
              <h2>{category.name}</h2>

              <div className={styles.list}>
                {category.movies.map((movie) => (
                  <div key={movie.id} className={styles.movieItem}>
                    <Link
                      href={`/movies/${movie.id}`}
                      className={styles.movieLink}
                      aria-label={`View details for ${movie.title}`}
                    >
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className={styles.moviePoster}
                      />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {showWelcomePopup && (
        <div className={styles.popupOverlay}>
          <section
            className={styles.welcomePopup}
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
          >
            <button
              type="button"
              className={styles.closePopup}
              onClick={closeWelcomePopup}
              aria-label="Close welcome popup"
            >
              ×
            </button>

            <div className={styles.popupLeft}>
              <section className={styles.popupLeftSection}>
                <h2 id="welcome-title">Who Are We</h2>
                <p>
                  We are just two people who want to help you
                  find your show.
                </p>
              </section>

              <section className={styles.popupLeftSection}>
                <h2>Why We Made This</h2>
                <p>
                  We made this to help people find any movie
                  or TV show easier to find.
                </p>
              </section>
            </div>

            <div className={styles.popupRight}>
              <section className={styles.popupRightSection}>
                <h2>What Our Website Does</h2>
                <p>
                  Users can search for any movie and/or TV show
                  and apply any filters of which subscriptions
                  they have to find it.
                </p>
              </section>

              <section className={styles.popupRightSection}>
                <h2>How It Works</h2>
                <p>
                  All you need to do is search a movie or TV show
                  and the results will pop up. You can even filter
                  which subscriptions you have and see if you are
                  able to watch it.
                </p>
              </section>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
