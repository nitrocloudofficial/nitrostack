package client

type User struct {
    Status string `json:"status"`
}

func StatusLabel(user User) string {
    switch user.Status {
    case "active":
        return "Active"
    case "inactive":
        return "Inactive"
    default:
        panic("unknown user status")
    }
}
