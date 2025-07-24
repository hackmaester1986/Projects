using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
public class VideoChatHub : Hub
{
    private readonly AppDbContext _context;
    private static ConcurrentDictionary<string, string> _users = new();
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
                if (user != null)
                {
                    _users[user.Username] = Context.ConnectionId;
                    Console.WriteLine($"User {user.Username} connected with ID {Context.ConnectionId}");
                }
            }
        }

        await Clients.All.SendAsync("UserListUpdate", _users.Keys.ToList());
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
        await Clients.All.SendAsync("UserListUpdate", _users.Keys.ToList());
        await base.OnDisconnectedAsync(exception);
    }
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

    public async Task SendRequest(string toUser, string fromUser)
    {
        await Clients.User(toUser).SendAsync("ReceiveRequest", fromUser);
    }
}