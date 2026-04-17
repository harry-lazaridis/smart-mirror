import { useState } from "react"
import "../styles/modulePageStyle.css"

import {
  ClockIcon,
  WeatherIcon,
  CalendarIcon,
  TransportIcon,
  NewsFeedIcon,
  DailyComplimentsIcon,
  NotesIcon,
  ModulesIcon,
} from '../views/Icons'

function iconModule (module){
  switch (module) {
    case "Clock":
      return <ClockIcon />
    case "Weather":
      return <WeatherIcon />
    case "Calendar":
      return <CalendarIcon />
    case "SL Departures":
      return <TransportIcon />
    case "News Feed":
      return <NewsFeedIcon />
    case "Daily Compliments":
      return <DailyComplimentsIcon />
      case "Notes":
        return <NotesIcon />
    default:
      return null
  }
}

function ModulesPage() {

  const [module, setModuleToggle] = useState ([
    {
      moduleID: 1,
      name: "Clock",
      category: "core",
      description: "Display current time and date",
      activeToggle: true,
    },
    {
      moduleID: 2,
      name: "Weather",
      category: "weather",
      description: "Current weather and forecast",
      activeToggle: true,
    },
    {
      moduleID: 3,
      name: "Calendar",
      category: "productivity",
      description: "Google Calendar events",
      activeToggle: true,
    },
    {
      moduleID: 4,
      name: "SL Departures",
      category: "transport",
      description: "Real-time Stockholm transport",
      activeToggle: true,
    },
    {
      moduleID: 5,
      name: "News Feed",
      category: "productivity",
      description: "Latest news headlines",
      activeToggle: false,
    },
    {
      moduleID: 6,
      name: "Daily Compliments",
      category: "core",
      description: "Random compliments to start your day",
      activeToggle: false,
    },
    {
      moduleID: 7,
      name: "Notes",
      category: "productivity",
      description: "Important reminders and thoughts",
      activeToggle: false,
    },
  ])

  function toggleModules (moduleID){
    setModuleToggle((previousState) => previousState.map((module) => {
    if (module.moduleID === moduleID) 
    return {...module, activeToggle: !module.activeToggle } //return new array with toggle change (toggled)

      else {
        return module //same content as before (not toggled)
      }
    }))
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Module Settings</h1>
        <p>Enable or disable MagicMirror modules.</p>
      </div>

      <div className="content-panel">
        <div className="module-modules-description">
        <div className="module-icon-header">
          <ModulesIcon />
        <h2>Available Modules</h2>
        </div>

        <p>Toggle modules on or off to customize your SmartMirror display.</p>
        </div>
        <div className="modules">

          {module.map((module) => (
            <div className="module-box" key={module.moduleID}>
              <div className="module-icon"> {iconModule(module.name)}</div>
              <div className="module-description">
              <div className="module-title-category">
              <h3>{module.name}</h3>
              <div className={"module-category " + module.category}>{module.category}</div>
              </div>
              <p>{module.description}</p>
              </div>

              <div className="module-toggle-box">
              <div>
                {module.activeToggle ? (<div className="module-active">Active</div>) : null }
              </div>

              <label className="switch">
                <input type="checkbox"
                      checked={module.activeToggle}
                      onChange={() => toggleModules(module.moduleID)}
                />
                <span className="slider round"></span>
              </label>

            </div>
            </div>
            
            
          ))}

        </div>
      </div>

      <div className="module-note">
          <strong className="note-style">Note:</strong> Module changes are saved to your Firebase Firestore database and will be synced to your MagicMirror in real-time.
        </div>
    </div>
  )
}

export default ModulesPage