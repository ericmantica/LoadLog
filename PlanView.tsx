import type { PlanWithDetails, UserProfile } from "./types";

interface WeeklyPlanViewProps {
  user: UserProfile | null;
  plan: PlanWithDetails | null;
  loading: boolean;
  message: string;
  error: string;
  onGenerate: () => void;
  onRegenerate: () => void;
}

function WeeklyPlanView(props: WeeklyPlanViewProps) {
  const { user, plan, loading, message, error, onGenerate, onRegenerate } = props;

  function getTodayDayNumber(): number {
    const jsDay = new Date().getDay();

    if (jsDay === 0) {
      return 7;
    }

    return jsDay;
  }

  function getDayLabel(dayNumber: number): string {
    if (dayNumber === 1) {
      return "Monday";
    } else if (dayNumber === 2) {
      return "Tuesday";
    } else if (dayNumber === 3) {
      return "Wednesday";
    } else if (dayNumber === 4) {
      return "Thursday";
    } else if (dayNumber === 5) {
      return "Friday";
    } else if (dayNumber === 6) {
      return "Saturday";
    } else {
      return "Sunday";
    }
  }

  function getTrainingDaysCount(): number {
    if (!plan) {
      return 0;
    }

    let count = 0;

    for (let i = 0; i < plan.days.length; i++) {
      if (plan.days[i].muscle_group !== "Rest") {
        count = count + 1;
      }
    }

    return count;
  }

  function getExerciseCount(): number {
    if (!plan) {
      return 0;
    }

    let count = 0;

    for (let i = 0; i < plan.days.length; i++) {
      count = count + plan.days[i].exercises.length;
    }

    return count;
  }

  function renderAlert() {
    if (error) {
      return (
        <div
          style={{
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "18px"
          }}
        >
          {error}
        </div>
      );
    }

    if (message) {
      return (
        <div
          style={{
            backgroundColor: "#dcfce7",
            color: "#166534",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "18px"
          }}
        >
          {message}
        </div>
      );
    }

    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        padding: "32px 20px"
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto"
        }}
      >
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
            marginBottom: "24px"
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "42px",
              lineHeight: 1.1,
              color: "#0f172a"
            }}
          >
            Weekly Workout Plan
          </h1>

          {user && (
            <div
              style={{
                marginTop: "18px",
                color: "#475569",
                fontSize: "18px",
                lineHeight: 1.8
              }}
            >
              <div>User: {user.display_name}</div>
              <div>Fitness Level: {user.fitness_level}</div>
              <div>Days / Week: {user.available_days_per_week}</div>
            </div>
          )}

          <div
            style={{
              marginTop: "22px",
              display: "flex",
              gap: "12px",
              flexWrap: "wrap"
            }}
          >
            <button
              onClick={onGenerate}
              disabled={loading || !user}
              style={{
                border: "none",
                borderRadius: "10px",
                padding: "12px 18px",
                fontSize: "16px",
                cursor: loading || !user ? "not-allowed" : "pointer",
                backgroundColor: "#2563eb",
                color: "#ffffff"
              }}
            >
              {loading ? "Generating..." : "Generate Plan"}
            </button>

            <button
              onClick={onRegenerate}
              disabled={loading || !user}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "12px 18px",
                fontSize: "16px",
                cursor: loading || !user ? "not-allowed" : "pointer",
                backgroundColor: "#ffffff",
                color: "#0f172a"
              }}
            >
              Regenerate Plan
            </button>
          </div>
        </div>

        {renderAlert()}

        {!plan && !loading && !error && (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)"
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#475569",
                fontSize: "18px"
              }}
            >
              No plan loaded yet.
            </p>
          </div>
        )}

        {plan && (
          <>
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                marginBottom: "24px"
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  marginBottom: "16px",
                  fontSize: "24px",
                  color: "#0f172a"
                }}
              >
                Weekly Summary
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "14px"
                }}
              >
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    borderRadius: "12px",
                    padding: "16px",
                    border: "1px solid #e2e8f0"
                  }}
                >
                  <div style={{ color: "#64748b", fontSize: "14px" }}>Week Start</div>
                  <div style={{ color: "#0f172a", fontSize: "18px", marginTop: "6px" }}>
                    {plan.week_start}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    borderRadius: "12px",
                    padding: "16px",
                    border: "1px solid #e2e8f0"
                  }}
                >
                  <div style={{ color: "#64748b", fontSize: "14px" }}>Status</div>
                  <div style={{ color: "#0f172a", fontSize: "18px", marginTop: "6px" }}>
                    {plan.status}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    borderRadius: "12px",
                    padding: "16px",
                    border: "1px solid #e2e8f0"
                  }}
                >
                  <div style={{ color: "#64748b", fontSize: "14px" }}>Training Days</div>
                  <div style={{ color: "#0f172a", fontSize: "18px", marginTop: "6px" }}>
                    {getTrainingDaysCount()}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    borderRadius: "12px",
                    padding: "16px",
                    border: "1px solid #e2e8f0"
                  }}
                >
                  <div style={{ color: "#64748b", fontSize: "14px" }}>Total Exercises</div>
                  <div style={{ color: "#0f172a", fontSize: "18px", marginTop: "6px" }}>
                    {getExerciseCount()}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: "18px"
              }}
            >
              {plan.days.map((day) => {
                const isToday = day.day_number === getTodayDayNumber();
                const isRestDay = day.muscle_group === "Rest";

                return (
                  <div
                    key={day.id}
                    style={{
                      backgroundColor: isRestDay ? "#f8fafc" : "#ffffff",
                      borderRadius: "16px",
                      padding: "22px",
                      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                      border: isToday ? "2px solid #2563eb" : "1px solid #e2e8f0"
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "12px",
                        flexWrap: "wrap"
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            marginTop: 0,
                            marginBottom: "8px",
                            fontSize: "24px",
                            color: "#0f172a"
                          }}
                        >
                          Day {day.day_number} · {getDayLabel(day.day_number)}
                        </h3>

                        <div
                          style={{
                            color: "#334155",
                            fontSize: "18px",
                            fontWeight: 600,
                            marginBottom: "8px"
                          }}
                        >
                          {day.muscle_group}
                        </div>

                        <div style={{ color: "#64748b", lineHeight: 1.8 }}>
                          <div>Date: {day.scheduled_date}</div>
                          <div>Status: {day.status}</div>
                        </div>
                      </div>

                      {isToday && (
                        <div
                          style={{
                            backgroundColor: "#dbeafe",
                            color: "#1d4ed8",
                            borderRadius: "999px",
                            padding: "8px 12px",
                            fontSize: "14px",
                            fontWeight: 600
                          }}
                        >
                          Today
                        </div>
                      )}
                    </div>

                    {isRestDay ? (
                      <div
                        style={{
                          marginTop: "18px",
                          backgroundColor: "#eef2f7",
                          borderRadius: "12px",
                          padding: "16px",
                          color: "#475569",
                          fontSize: "16px"
                        }}
                      >
                        Rest Day
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: "18px",
                          display: "grid",
                          gap: "12px"
                        }}
                      >
                        {day.exercises.map((exercise) => (
                          <div
                            key={exercise.id}
                            style={{
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              padding: "16px",
                              backgroundColor: "#ffffff"
                            }}
                          >
                            <div
                              style={{
                                fontSize: "18px",
                                fontWeight: 700,
                                color: "#0f172a",
                                marginBottom: "8px"
                              }}
                            >
                              {exercise.name}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                flexWrap: "wrap"
                              }}
                            >
                              <span
                                style={{
                                  backgroundColor: "#eff6ff",
                                  color: "#1d4ed8",
                                  borderRadius: "999px",
                                  padding: "6px 10px",
                                  fontSize: "14px"
                                }}
                              >
                                {exercise.target_sets} sets
                              </span>

                              <span
                                style={{
                                  backgroundColor: "#f8fafc",
                                  color: "#334155",
                                  borderRadius: "999px",
                                  padding: "6px 10px",
                                  fontSize: "14px"
                                }}
                              >
                                {exercise.target_reps} reps
                              </span>

                              <span
                                style={{
                                  backgroundColor: "#f0fdf4",
                                  color: "#166534",
                                  borderRadius: "999px",
                                  padding: "6px 10px",
                                  fontSize: "14px"
                                }}
                              >
                                {exercise.current_weight} lbs
                              </span>

                              <span
                                style={{
                                  backgroundColor: "#fff7ed",
                                  color: "#c2410c",
                                  borderRadius: "999px",
                                  padding: "6px 10px",
                                  fontSize: "14px"
                                }}
                              >
                                +{exercise.progression_step} lbs step
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default WeeklyPlanView;