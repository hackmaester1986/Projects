public class CallSession
{
    public int Id { get; set; }
    public int CallerId { get; set; }
    public int ReceiverId { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
}