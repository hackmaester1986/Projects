using Microsoft.AspNetCore.SignalR;

public class VideoChatHub : Hub
{
    public async Task SendOffer(string toUser, string offer)
    {
        await Clients.User(toUser).SendAsync("ReceiveOffer", offer);
    }

    public async Task SendAnswer(string toUser, string answer)
    {
        await Clients.User(toUser).SendAsync("ReceiveAnswer", answer);
    }

    public async Task SendIceCandidate(string toUser, string candidate)
    {
        await Clients.User(toUser).SendAsync("ReceiveIceCandidate", candidate);
    }
}