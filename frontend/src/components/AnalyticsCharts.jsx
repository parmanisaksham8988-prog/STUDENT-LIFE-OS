import React from "react";

function AnalyticsCharts({ attendanceData = [], priorityData = { High: 0, Medium: 0, Low: 0 }, totalTasks = 0, completedTasks = 0 }) {
  const pendingCount = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="analytics-section">
      <div className="charts-grid">
        {/* ATTENDANCE THRESHOLD BAR CHART */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>📊 Subject Attendance vs 75% Requirement</h3>
              <p>Green bars meet the 75% exam eligibility; red bars indicate a shortage.</p>
            </div>
            <div className="chart-legend">
              <span className="legend-item"><span className="dot safe"></span> &ge; 75% Eligible</span>
              <span className="legend-item"><span className="dot warning"></span> &lt; 75% Shortage</span>
            </div>
          </div>

          {attendanceData.length === 0 ? (
            <p className="empty-chart-msg">No attendance subjects logged yet.</p>
          ) : (
            <div className="bar-chart-container">
              <div className="threshold-line" title="75% Requirement Line">
                <span className="threshold-label">75% Target</span>
              </div>

              <div className="bars-wrapper">
                {attendanceData.map((item, idx) => {
                  const isEligible = item.percentage >= 75;
                  return (
                    <div className="bar-column" key={idx}>
                      <div className="bar-value-top">{item.percentage}%</div>
                      <div className="bar-track">
                        <div
                          className={`bar-fill ${isEligible ? "fill-safe" : "fill-warning"}`}
                          style={{ height: `${Math.min(item.percentage, 100)}%` }}
                        ></div>
                      </div>
                      <div className="bar-subject-name" title={item.subject}>
                        {item.subject}
                      </div>
                      <div className="bar-fraction">
                        {item.attended}/{item.total}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* WORKLOAD & PRIORITY DISTRIBUTION */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>🎯 Task Priority & Completion Breakdown</h3>
              <p>Active workload distribution by urgency and priority.</p>
            </div>
          </div>

          <div className="productivity-breakdown">
            {/* Completion Progress Bar */}
            <div className="completion-box">
              <div className="completion-labels">
                <span>Task Completion Progress</span>
                <strong>{completionRate}% Done ({completedTasks}/{totalTasks})</strong>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${completionRate}%` }}></div>
              </div>
            </div>

            {/* Priority Distribution Cards */}
            <div className="priority-cards-row">
              <div className="priority-stat-box high">
                <div className="priority-tag">🚨 High Priority</div>
                <div className="priority-count">{priorityData.High || 0}</div>
                <p>Urgent Assignments</p>
              </div>

              <div className="priority-stat-box medium">
                <div className="priority-tag">⚡ Medium</div>
                <div className="priority-count">{priorityData.Medium || 0}</div>
                <p>Regular Coursework</p>
              </div>

              <div className="priority-stat-box low">
                <div className="priority-tag">📝 Low</div>
                <div className="priority-count">{priorityData.Low || 0}</div>
                <p>Optional Reading</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsCharts;
