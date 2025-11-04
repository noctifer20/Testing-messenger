import { useEffect, useRef, useState } from "react"
import socket from "../../Socket"
import ACTIONS from "../../Socket/actions"
import { Navigate, replace, useNavigate } from "react-router"
import { v4 } from "uuid"

export default function Main() {
    const history = useNavigate()
    const [rooms, updateRooms] = useState([])
    const rootNode = useRef()

    useEffect(() => {
        socket.on(ACTIONS.SHARE_ROOMS, ({ rooms = [] } = {}) => {
            if(rootNode.current){
                updateRooms(rooms)
            }
        });
    }, [])

    return (
        <div ref={rootNode}>
            <h1>Avilable rooms</h1>
            <ul>
                {rooms.map(roomId => (
                    <li key={roomId}>
                        {roomId}
                        <button onClick={() => {
                            history(`/room/${roomId}`, { replace: true })
                        }}>JOIN ROOM</button>
                    </li>
                ))}
            </ul>
            <button onClick={() => {
                history(`/room/${v4()}`, { replace: true })
            }}>Create New Room</button>
        </div>
    )
}

