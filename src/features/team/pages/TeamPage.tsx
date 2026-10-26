function MemberPortrait({
  member,
  className = '',
}: {
  member: Member;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageFailed || !member.photo) {
    return (
      <div
        className={`kk-photo-placeholder ${className}`}
        role="img"
        aria-label={`Photo placeholder for ${member.name}`}
      >
        <Users size={42} strokeWidth={1} />
        <span>PHOTO COMING SOON</span>
      </div>
    );
  }

  return (
    <img
      src={member.photo}
      alt={`${member.name} — ${member.role}`}
      className={`kk-member-photo ${className}`}
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  );
}
