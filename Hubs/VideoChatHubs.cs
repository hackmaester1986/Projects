using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
public class VideoChatHub : Hub
{
    private readonly AppDbContext _context;
    private static ConcurrentDictionary<string, UserHubConnection> _users = new();
    public VideoChatHub(AppDbContext context)
    {
        _context = context;
    }

    public override async Task OnConnectedAsync()
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim != null)
        {
            // Ensure this matches your User.Id type
            if (int.TryParse(userIdClaim.Value, out int userId))
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
                UserHubConnection userHubConnection = new UserHubConnection()
                {
                    UserId = user.Id,
                    UserName = user.Username,
                    ConnectionId = Context.ConnectionId
                };
                if (user != null)
                {
                    _users[user.Username] = userHubConnection;
                    Console.WriteLine($"User {user.Username} connected with ID {Context.ConnectionId}");
                }
            }
        }
        await Clients.All.SendAsync("UserListUpdate", _users.Values.ToList());
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception exception)
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);

        if (userIdClaim != null)
        {
            // Ensure this matches your User.Id type
            if (int.TryParse(userIdClaim.Value, out int userId))
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
                if (user != null)
                {
                    _users.TryRemove(user.Username, out _);
                }
            }
        }
        await Clients.All.SendAsync("UserListUpdate", _users.Values.ToList());
        await base.OnDisconnectedAsync(exception);
    }
    public async Task SendOffer(UserHubConnection toUser, UserHubConnection fromUser, string offer)
    {
        await Clients.User(toUser.UserId.ToString()).SendAsync("ReceiveOffer", fromUser, offer);
    }

    public async Task SendAnswer(string toUser, string answer)
    {
        await Clients.User(toUser).SendAsync("ReceiveAnswer", answer);
    }

    public async Task SendIceCandidate(string toUser, string candidate)
    {
        await Clients.User(toUser).SendAsync("ReceiveIceCandidate", candidate);
    }

    public async Task SendRequest(UserHubConnection toUser, UserHubConnection fromUser)
    {
        await Clients.User(toUser.UserId.ToString()).SendAsync("ReceiveRequest", fromUser);
    }

    public async Task SendRequestDeny(UserHubConnection toUser)
    {
        await Clients.User(toUser.UserId.ToString()).SendAsync("ReceiveDenyRequest");
    } 
    public async Task SendHangUp(string toUserId)
    {
        await Clients.User(toUserId).SendAsync("ReceiveHangUp");
    }
}