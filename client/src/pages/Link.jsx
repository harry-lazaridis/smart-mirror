import { useEffect, useState } from "react";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom"
import QRCode from "react-qr-code";

export default function Link() {
    const [deviceId, setDeviceId] = useState(null);
    
    const navigate = useNavigate();

    return (
        <div>
            <QRCode 
                size={256}
                value={'Hello World'} 
            />
        </div>
    )
}