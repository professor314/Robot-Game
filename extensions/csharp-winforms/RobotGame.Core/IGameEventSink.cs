namespace RobotGame.Core;

/// <summary>
/// Receives game events raised by characters and symbols. <see cref="GameWorld"/> implements
/// this and re-publishes events to subscribers (the UI, the log window, tests). Replaces the
/// original's <c>static</c> attack event and per-object <c>INotifyPropertyChanged</c> plumbing.
/// </summary>
public interface IGameEventSink
{
    /// <summary>Publish a game event to all observers.</summary>
    void Raise(GameEvent gameEvent);
}
