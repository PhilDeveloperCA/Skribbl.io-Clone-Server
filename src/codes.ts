// Error Codes
export const ErrorCodes = {
    GameFull : 'Game Room Is Full',
    NameTaken : "Username Is Taken",
    GameDNE : "Game Does Not Exist",
    InvalidCreate : "Missing Fields : Name || Seconds || Rounds",
    InvalidJoin : "Missing Fields : Name || Game ID",
    SystemError: "Server System Error",
    InvalidDraw : "invalid draw"
}

export const ActionCodes = {
    PlayerJoined : "Player Joined",
    PlayerLeft : "Player Left",
    NewAdmin : "New Admin",
    GameDied : "Game Died",
    UnDraw : "Undraw",
    Draw : "Draw",
    RestartDraw : "Restart",
    NewDrawer : "New Drawer",
    GameStarted : "Game Started",
}