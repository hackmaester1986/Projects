
public class UserService : IUserService
{
    private readonly AppDbContext _context;

    public UserService(AppDbContext context)
    {
        _context = context;
    }
    public Task<string> GetCurrentUser()
    {
        throw new NotImplementedException();
    }
}