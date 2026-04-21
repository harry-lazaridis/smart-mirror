import { observer } from "mobx-react-lite"
import { DashBoardView } from "../views/dashBoardView"

const Dashboard = observer(
    function DashboardRender(props) {
        const model = props.model;
        return ( <DashBoardView 
            calendarConnected={model.calendarConnected}
            transportActive={model.transportActive}
            activeModules={model.activeModules}
            activites={model.activites}
            />
        );
    }
);

export {Dashboard};