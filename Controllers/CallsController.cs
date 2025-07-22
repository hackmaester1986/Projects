using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CallsController : ControllerBase
{
    private readonly AppDbContext _context;

    public CallsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("start")]
    public async Task<IActionResult> StartCall(int receiverId)
    {
        int callerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var call = new CallSession
        {
            CallerId = callerId,
            ReceiverId = receiverId,
            StartedAt = DateTime.UtcNow
        };

        _context.CallSessions.Add(call);
        await _context.SaveChangesAsync();

        return Ok(new { call.Id });
    }

    [HttpPost("end/{callId}")]
    public async Task<IActionResult> EndCall(int callId)
    {
        var call = await _context.CallSessions.FindAsync(callId);
        if (call == null)
            return NotFound();

        call.EndedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok();
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetCallHistory()
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var calls = await _context.CallSessions
            .Where(c => c.CallerId == userId || c.ReceiverId == userId)
            .OrderByDescending(c => c.StartedAt)
            .ToListAsync();

        return Ok(calls);
    }
}