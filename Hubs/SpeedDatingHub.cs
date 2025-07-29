using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;
using System.Security.Claims;
[Authorize]
public class SpeedDatingHub : Hub
{
    private readonly AppDbContext _context;

    // Tracks group membership: GroupId -> List of users
    private static ConcurrentDictionary<string, List<UserHubConnection>> _groups = new();

    // Tracks the dates
    private static ConcurrentDictionary<string, List<UserHubConnectionPair>> _pairs = new();

    // Tracks connectionId -> groupId
    private static ConcurrentDictionary<string, string> _userGroupMap = new();

    public SpeedDatingHub(AppDbContext context)
    {
        _context = context;
    }
    /*public async Task GetGroupMembersAndPairings(string userId)
    {
        var matchingGroup = _groups
            .FirstOrDefault(g => g.Value.Any(u => u.UserId.ToString() == userId));
        var matchingPairings = _pairs
            .FirstOrDefault(g => g.Value.Any(pair => pair.Item1.UserId.ToString() == userId || pair.Item2.UserId.ToString() == userId));

        await Clients.Group(matchingGroup.Key).SendAsync("ReceiveGroupsAndPairings");
    }*/
    public override async Task OnConnectedAsync()
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return;

            var userConnection = new UserHubConnection
            {
                UserId = user.Id,
                UserName = user.Username,
                ConnectionId = Context.ConnectionId
            };

            // Assign user to a group
            string groupId = FindOrCreateAvailableGroup();
            _userGroupMap[Context.ConnectionId] = groupId;

            _groups.AddOrUpdate(groupId,
                (_) => new List<UserHubConnection> { userConnection },
                (_, existingList) =>
                {
                    existingList.Add(userConnection);
                    return existingList;
                });

            await Groups.AddToGroupAsync(Context.ConnectionId, groupId);
            var groupMembers = _groups[groupId];
            await Clients.Group(groupId).SendAsync("SendMemberCount", groupMembers.Count);
            Console.WriteLine($"User {user.Username} joined group {groupId}");

            if (_groups[groupId].Count == 4)
            {
                var pairings = GeneratePairings(groupMembers);

                _pairs[groupId] = pairings;

                await Clients.Group(groupId).SendAsync("StartSpeedDating", groupMembers, pairings);
            }
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception exception)
    {
        if (_userGroupMap.TryRemove(Context.ConnectionId, out var groupId))
        {
            if (_groups.TryGetValue(groupId, out var members))
            {
                var memberToRemove = members.FirstOrDefault(m => m.ConnectionId == Context.ConnectionId);
                if (memberToRemove != null)
                {
                    members.Remove(memberToRemove);
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupId);
                    Console.WriteLine($"User {memberToRemove.UserName} left group {groupId}");

                    if (members.Count == 0)
                    {
                        _groups.TryRemove(groupId, out _);
                        _pairs.TryRemove(groupId, out _);
                    }
                }
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    private string FindOrCreateAvailableGroup()
    {
        foreach (var kvp in _groups)
        {
            if (kvp.Value.Count < 4)
                return kvp.Key;
        }
        return Guid.NewGuid().ToString();
    }

    private List<UserHubConnectionPair> GeneratePairings(List<UserHubConnection> users)
    {
        var pairings = new List<UserHubConnectionPair>();
        for (int i = 0; i < users.Count; i++)
        {
            for (int j = i + 1; j < users.Count; j++)
            {
                var newPair = new UserHubConnectionPair
                {
                    First = users[i],
                    Second = users[j]
                };
                pairings.Add(newPair);
            }
        }
        return pairings;
    }

    // WebRTC signaling
    public async Task SendOffer(string toUserId, UserHubConnection fromUser, object offer)
    {
       // var toUserConnId = GetConnectionIdByUserId(toUserId);
      //  if (toUserConnId != null)
      //  {
            await Clients.Client(toUserId.ToString()).SendAsync("ReceiveOffer", fromUser.UserId.ToString(), offer);
     //   }
    }

    public async Task SendAnswer(int toUserId, object answer)
    {
        //var toUserConnId = GetConnectionIdByUserId(toUserId);
        //if (toUserConnId != null)
        //{
            await Clients.Client(toUserId.ToString()).SendAsync("ReceiveAnswer", Context.UserIdentifier, answer);
       // }
    }

    public async Task SendIceCandidate(string toUserId, object candidate)
    {
        //var toUserConnId = GetConnectionIdByUserId(toUserId);
        //if (toUserConnId != null)
        //{
            await Clients.Client(toUserId.ToString()).SendAsync("ReceiveIceCandidate", Context.UserIdentifier, candidate);
       // }
    }

    private string? GetConnectionIdByUserId(int userId)
    {
        return _groups
            .SelectMany(kvp => kvp.Value)
            .FirstOrDefault(u => u.UserId == userId)?.ConnectionId;
    }
}

