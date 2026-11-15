
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

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

export default function Home() {
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);

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
    setSubmittedSearch(search.trim());
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
        {(submittedSearch || activeFilters.length > 0) && (
          <p className={styles.searchMessage} role="status">
            {submittedSearch && <>Search: {submittedSearch} </>}

            {activeFilters.length > 0 && (
              <>Streaming Services: {activeFilters.join(", ")}</>
            )}
          </p>
        )}

        {categories.map((category) => (
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
        ))}
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
