import { useEffect, useState } from "react";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom"

//import QRCode from "react-qr-code";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react"

const getOrCreateDeviceId = () => {

}

export default function Syncs() {
    const [deviceId, setDeviceId] = useState(null);
    
    const navigate = useNavigate();

    return (
        <div>
            <QRCodeSVG width="512" height="512" value="https://reactjs.org/"/>
        </div>
    )
}