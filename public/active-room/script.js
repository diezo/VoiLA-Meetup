const body = document.querySelector("body")
const connecting_screen = document.querySelector("#connecting-screen")
const message_input = document.querySelector("#message-input")
const room_id_display = document.querySelector("#room-id-display")
const messages_container = document.querySelector("#messages-container")
const message_box_container = document.querySelector("#message-box-container")
const end_room_button = document.querySelector("#end-room-button")
const room_id = document.querySelector("#room-id").innerHTML.toString().trim()
var user_name = document.querySelector("#user-name").innerHTML.toString().trim()
const server_temp = window.location
const server = server_temp.substring(0, server_temp.length - 1)
var socket = null

// Verify username
while (user_name == "" || user_name == null || user_name == undefined)
{
    user_name_temp = prompt("Enter your name: ")

    if (user_name_temp != null && user_name_temp != undefined)
    {
        user_name = user_name_temp.toString().trim()
    }
}

// Listeners
body.onload = () => {
    document.title = "Connecting..."

    ConnectToServer()
}
end_room_button.onclick = () => {
    let answer = confirm("Confirm you want to end this MeetUp now?")

    if (answer)
    {
        EndRoom()
    }
}
message_input.onkeypress = (e) => {
    if (e.keyCode == 13)
    {
        let message = message_input.value.toString().trim()

        if (message != "")
        {
            SendMessage(message)
        }

        message_input.value = ""
    }
}

// Functions
function ToggleConnectingScreen(value)
{
    if (value)
    {
        connecting_screen.style.visibility = "visible"
    }
    else
    {
        connecting_screen.style.visibility = "hidden"
    }
}

function ConnectToServer()
{
    ToggleConnectingScreen(true)

    socket = io(server + "/active_room", {
        reconnection: false,
        query: {
            user_name: user_name,
            room_id: room_id
        }
    })

    socket.on("connect", () => {
        document.title = room_id + " - Connected"
        room_id_display.innerHTML = room_id
        ToggleConnectingScreen(false)

        message_input.value = ""
        message_input.focus()
    })

    socket.on("connect_error", (err) => {
        message_input.blur()
        message_input.value = ""

        var error = err.toString().trim()
        error = error.substring(7, error.length)
        let error_message = "Something went wrong!"

        if (isCEFS(error))
        {
            error_message = error.substring(2, error.length).trim()
        }

        DisconnectFromServer(socket)
        alert(error_message)
        ConnectToServer()
    })

    socket.on("disconnect", () => {
        message_input.blur()
        message_input.value = ""

        DisconnectFromServer(socket)
        alert("You were disconnected from the server.")
        ConnectToServer()
    })

    socket.on("receive_message", (object) => {
        let sender_name = object.sender.name.toString()
        let message = object.message.toString()
        let sender_id = object.sender.id.toString()

        if (connected())
        {
            let my_id = socket.id

            if (my_id != null)
            {
                if (sender_id == my_id)
                {
                    // Sent by me
                    AddMessage(0, {
                        message: message
                    })
                }
                else
                {
                    // Sent by someone else
                    AddMessage(1, {
                        sender_name: sender_name,
                        message: message
                    })
                }
            }
        }
    })

    socket.on("user_joined", data => {
        let other_user_name = data.toString().trim()

        AddMessage(2, {
            other_user_name: other_user_name
        })
    })

    socket.on("user_left", data => {
        let other_user_name = data.toString().trim()
        
        AddMessage(3, {
            other_user_name: other_user_name
        })
    })

    socket.on("room_ended", other_user_name_temp => {
        let other_user_name = other_user_name_temp.toString()

        socket.off("disconnect")
        socket.off("connect_error")
        
        message_input.blur()
        message_input.disabled = true
        message_box_container.style.visibility = "hidden"
        end_room_button.style.visibility = "hidden"
        AddMessage(4, {
            other_user_name: other_user_name
        })
    })
}

function AddMessage(id, object)
{
    var toAdd = ""

    if (id == 0)
    {
        // Sent by me
        let message = object.message

        toAdd = `
        <div class="message-sent">
            <div class="box">
                <div class="message">` + message + `</div>
            </div>
        </div>
        `
    }
    else if (id == 1)
    {
        // Sent by other user
        let message = object.message
        let sender_name = object.sender_name

        toAdd = `
        <div class="message-received">
            <div class="box">
                <div class="sender-name">` + sender_name + `</div>
                <div class="message">` + message + `</div>
            </div>
        </div>
        `
    }
    else if (id == 2)
    {
        // User joined
        let other_user_name = object.other_user_name

        toAdd = `
        <div class="info-message">
            <center>
                <hr>
                <span>` + other_user_name + " joined" + `</span>
                <hr>
            </center>
        </div>
        `
    }
    else if (id == 3)
    {
        // User left
        let other_user_name = object.other_user_name

        toAdd = `
        <div class="info-message">
            <center>
                <hr>
                <span>` + other_user_name + " left" + `</span>
                <hr>
            </center>
        </div>
        `
    }
    else if (id == 4)
    {
        let other_user_name = object.other_user_name

        toAdd = `
        <div class="info-message">
            <center>
                <hr>
                <span style="color: red">MeetUp ended by <b>` + other_user_name + `</b></span>
                <hr>
            </center>
        </div>
        `
    }

    messages_container.innerHTML += toAdd

    // Scroll to bottom
    messages_container.scrollTop = messages_container.scrollHeight
}

function DisconnectFromServer(socket)
{
    socket.removeAllListeners()
}

function isCEFS(text)
{
    if (text.length > 2)
    {
        if (text.substring(0, 2) == "SS")
        {
            return true
        }
        else
        {
            return false
        }
    }
    else
    {
        return false
    }
}

function EndRoom()
{
    if (connected())
    {
        socket.emit("end_room")
    }
}

function SendMessage(message)
{
    if (connected())
    {
        socket.emit("message", message)
    }
}

function connected()
{
    return socket != null && socket.connected
}