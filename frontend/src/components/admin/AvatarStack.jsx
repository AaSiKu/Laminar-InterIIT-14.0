export function AvatarStack({ count }) {
  const displayCount = Math.min(count, 3);
  const extraCount = count > 3 ? count - 3 : 0;

  return (
    <div className="admin-avatar-stack">
      {Array.from({ length: displayCount }).map((_, i) => (
        <div key={i} className="admin-avatar-stack-item">
          <img src={`https://i.pravatar.cc/40?img=${i + 10}`} alt="Member" />
        </div>
      ))}
      {extraCount > 0 && (
        <div className="admin-avatar-stack-more">+{extraCount}</div>
      )}
    </div>
  );
}

