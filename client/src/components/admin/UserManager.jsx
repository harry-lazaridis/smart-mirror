import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../../firebase";

export default function UserManager() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            
            //TODO Morgondagens problem
            console.log(u);

            setName(u.displayName);
            setEmail(u.email);
        })

        return () => unsub();
    }, []);

    return(
        <>
            <form>
                <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <input 
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </form>
        </>
    )
}