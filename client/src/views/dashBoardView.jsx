import { useEffect } from "react";
import "../styles/dashBoardStyle.css";

export function DashBoardView(props){
    const activities = props.activities || [];


    const [calendar, setCalendar] = useState(null);
    const [calendar, setCalendar] = useState(null);
    const [calendar, setCalendar] = useState(null);
    const [calendar, setCalendar] = useState(null);
    const [calendar, setCalendar] = useState(null);
    
    useEffect(() => {
        //Fetchar du data för alla olika states,

        setCalendar([data]);

        
    }, [])
    
    return(
        <div className="dashboard">

            <div className="dashboardHeader">
                <h1> Dashboard </h1>
                <p> Overview of your SmartMirror configuration </p>
            </div>

            <div className="dashboardCards">
                {/*Google Calendar card*/}
                <div className="card">
                    <h3> Google Calendar </h3>
                    {/*Needs to create the functionality for this to display correctly*/}
                    <p className="statusUnSuccessful">{props.calendarConnected ? "Connected" : "Not Connected"}</p>
                    <span>{props.calendarConnected? "Displaying Events" : "Connect to display events"}</span>
                </div>
                    
                <div className="card">
                    <h3> SL Transport </h3>
                    <p className="statusSuccessful">{props.transportActive ? "Active" : "Inactive"}</p>
                    <span>Showing departures</span>
                </div>

                <div className="card">
                    <h3> Active Modules </h3>
                    {/* Needs a functional way to get active modules */}
                    <p className="dashNumber">{props.activeModules ?? 0}</p>
                    <span>Modules currently enabled</span>
                </div>  
            </div>

            <div className="dashBoardActivity">
                <h3>Recent Activity</h3>
                <p>Latest changes to your SmartMirror configuration</p>

                {activities.length === 0 ? ( <p>No recent activity</p>) : (activities.map((activity, index) => (
                    <div className="activityItem" key={activity.id || index}>
                        <strong>{activity.title}</strong>
                        <p>{activity.description}</p>
                        <span>{activity.time}</span>
                    </div>
                    ))
                )}
            </div>
        </div>
    )
}