//import { useState } from "react"
import "../styles/modulePageStyle.css"

function ModulesPage() {

  const module = [
    {
      moduleID: 1,
      name: "Clock",
      category: "core",
      description: "Display current time and date",
    },
    {
      moduleID: 2,
      name: "Weather",
      category: "weather",
      description: "Current weather and forecast",
    },
    {
      moduleID: 3,
      name: "Calendar",
      category: "productivity",
      description: "Google Calendar events",
    },
    {
      moduleID: 4,
      name: "SL Departures",
      category: "transport",
      description: "Real-time Stockholm transport",
    },
    {
      moduleID: 5,
      name: "News Feed",
      category: "productivity",
      description: "Latest news headlines",
    },
    {
      moduleID: 6,
      name: "Daily Compliments",
      category: "core",
      description: "Random compliments to start your day",
    },
    {
      moduleID: 7,
      name: "Notes",
      category: "productivity",
      description: "Important reminders and thoughts",
    },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h1>Module Settings</h1>
        <p>Enable or disable MagicMirror modules.</p>
      </div>

      <div className="content-panel">
        <h2>Available modules</h2>
        <p>Toggle modules on or off to customize your SmartMirror display.</p>
        <div className="modules">
          {module.map((module) => (
            <div className="module-box" key={module.moduleID}>
              <h3>{module.name}</h3>
              <p>{module.description}</p>
      
            </div>
            
          ))}

        </div>

      </div>
    </div>
  )
}

export default ModulesPage