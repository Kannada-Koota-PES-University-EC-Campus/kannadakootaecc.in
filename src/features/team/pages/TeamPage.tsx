import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Link } from 'react-router-dom';
import {
  getAllYears,
  getClubHeads,
  getDomainHeads,
  Member,
} from '@/features/team/data/team';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Crown,
  Github,
  Instagram,
  Linkedin,
  Sparkles,
  Users,
} from 'lucide-react';
import './TeamPage.css';

function SocialLinks({ member }: { member: Member }) {
  const links = [
    { url: member.linkedin, label: 'LinkedIn', Icon: Linkedin },
    { url: member.instagram, label: 'Instagram', Icon: Instagram },
    { url: member.github, label: 'GitHub', Icon: Github },
  ].filter((link) => link.url);

  if (!links.length) return null;

  return (
    <div className="kk-socials">
      {links.map(({ url, label, Icon }) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${member.name} on ${label}`}
          className="kk-social-link"
        >
          <Icon size={16} />
        </a>
      ))}
    </div>
  );
}

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
        aria-label={`Photo coming soon for ${member.name}`}
      >
        <Users size={34} strokeWidth={1} />
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

function LeaderProfile({
  member,
  number,
}: {
  member: Member;
  number: string;
}) {
  return (
    <article className="kk-leader-pair-profile">
      <div className="kk-leader-pair-photo">
        <MemberPortrait
          member={member}
          className="kk-leader-pair-image"
        />
