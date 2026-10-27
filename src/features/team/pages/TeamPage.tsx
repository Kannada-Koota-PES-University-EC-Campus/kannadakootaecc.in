
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
        <span className="kk-leader-pair-number">{number}</span>
      </div>

      <div className="kk-leader-pair-info">
        <span className="kk-role-label">{member.role}</span>
        <h3>{member.name}</h3>

        {member.bio && (
          <p className="kk-leader-bio">{member.bio}</p>
        )}

        <SocialLinks member={member} />
      </div>
    </article>
  );
}

export default function Team() {
  const allYears = getAllYears();

  const [selectedYear, setSelectedYear] = useState(
    allYears[0] || new Date().getFullYear()
  );

  const [domainIndex, setDomainIndex] = useState(0);
  const [domainTouchStart, setDomainTouchStart] = useState<number | null>(
    null
  );

  const clubHeads = getClubHeads(selectedYear);
  const domainHeads = getDomainHeads(selectedYear);

  // Identify Head and Vice Head from their role labels.
  const viceHead = clubHeads.find((member) =>
    /\bvice\s*head\b/i.test(member.role)
  );

  const head = clubHeads.find(
    (member) =>
      /\bhead\b/i.test(member.role) &&
      !/\bvice\s*head\b/i.test(member.role)
  );

  // If role labels differ, use the first two members as a fallback.
  const displayedLeaders =
    head || viceHead
      ? [head, viceHead].filter(
          (member): member is Member => Boolean(member)
        )
      : clubHeads.slice(0, 2);

  const changeYear = (year: number) => {
    setSelectedYear(year);
    setDomainIndex(0);
  };

  const moveDomains = (direction: number) => {
    if (!domainHeads.length) return;

    setDomainIndex((current) => {
      const next = current + direction;

      if (next < 0) return domainHeads.length - 1;
      if (next >= domainHeads.length) return 0;

      return next;
    });
  };

  const handleDomainTouchEnd = (endX: number) => {
    if (domainTouchStart === null) return;

    const difference = endX - domainTouchStart;

    if (Math.abs(difference) > 50) {
      moveDomains(difference < 0 ? 1 : -1);
    }

    setDomainTouchStart(null);
  };

  return (
    <main className="koota-team-page">
      {/* HERO */}
      <section className="kk-hero">
        <div className="kk-hero-decoration kk-decoration-one" />
        <div className="kk-hero-decoration kk-decoration-two" />

        <div className="kk-hero-inner">
          <div className="kk-eyebrow">
            <span className="kk-eyebrow-line" />
            THE PEOPLE OF KANNADA KOOTA
            <span className="kk-eyebrow-line" />
          </div>

          <h1 className="kk-hero-title">
            ನಮ್ಮ <span>ತಂಡ</span>
          </h1>

          <p className="kk-hero-subtitle">
            The people behind our roots.
          </p>

          <p className="kk-hero-description">
            Every celebration has a story. Every story has people.
            Meet the passionate minds bringing Kannada culture to life
            at PES University, Electronic City Campus.
          </p>

          <a href="#kk-leadership" className="kk-explore-link">
            MEET THE PEOPLE
            <ArrowRight size={17} />
          </a>

          <div className="kk-group-photo">
            <img
              src="/kannada-koota-team.jpg"
              alt="Kannada Koota ECC Core Team"
              className="kk-group-photo-image"
              loading="lazy"
            />

            <div className="kk-group-photo-overlay" />

            <div className="kk-group-photo-content">
              <span className="kk-group-kannada">ಒಂದೇ ಕುಟುಂಬ</span>
              <span className="kk-group-english">
                ONE COMMUNITY. MANY STORIES.
              </span>
            </div>

            <span className="kk-photo-index">KKC / ECC</span>
          </div>

          <div className="kk-hero-bottom">
            <span>ROOTED IN CULTURE</span>
            <span className="kk-bottom-dot">✳</span>
            <span>UNITED BY LANGUAGE</span>
            <span className="kk-bottom-dot">✳</span>
            <span>DRIVEN BY PEOPLE</span>
          </div>
        </div>
      </section>

      {/* YEAR SELECTOR */}
      <section className="kk-year-bar" aria-label="Select team year">
        <div className="kk-year-inner">
          <div className="kk-year-label">
            <span>EXPLORE OUR TEAM</span>
            <strong>Every year, a new chapter.</strong>
          </div>

          <div className="kk-year-options">
            {allYears.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => changeYear(year)}
                className={`kk-year-button ${
                  selectedYear === year ? 'active' : ''
                }`}
                aria-pressed={selectedYear === year}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* HEAD AND VICE HEAD — DISPLAYED TOGETHER */}
      <section id="kk-leadership" className="kk-leadership">
        <div className="kk-section-heading">
          <div className="kk-section-kicker">
            <Crown size={15} />
            THE HEART OF THE COMMUNITY
          </div>

          <h2>
            The people who <span>lead.</span>
          </h2>

          <p>
            Different perspectives. One shared purpose.
            Meet the people steering our journey.
          </p>
        </div>

        {displayedLeaders.length > 0 ? (
          <div className="kk-leader-pair">
            {displayedLeaders.map((member, index) => (
              <LeaderProfile
                key={member.id}
                member={member}
                number={String(index + 1).padStart(2, '0')}
              />
            ))}
          </div>
        ) : (
          <p className="kk-empty-state">
            No leadership details are available for {selectedYear}.
          </p>
        )}
      </section>

      {/* DOMAIN HEADS — MOVABLE GALLERY */}
      <section className="kk-domains" id="kk-domains">
        <div className="kk-domains-heading">
          <div>
            <div className="kk-section-kicker">
              <Sparkles size={15} />
              THE MINDS BEHIND THE MAGIC
            </div>

            <h2>
              Many talents. <span>One team.</span>
            </h2>

            <p>
              Meet the people bringing every part of Kannada Koota to life.
            </p>
          </div>

          <div className="kk-domain-count">
            <strong>
              {String(domainHeads.length).padStart(2, '0')}
            </strong>
            <span>DOMAIN HEADS</span>
          </div>
        </div>

        {domainHeads.length > 0 ? (
          <>
            <div
              className="kk-domain-gallery"
              onTouchStart={(event) =>
                setDomainTouchStart(event.touches[0].clientX)
              }
              onTouchEnd={(event) =>
                handleDomainTouchEnd(event.changedTouches[0].clientX)
              }
            >
              
            <div
              className="kk-domain-gallery-track"
              style={{
                transform: `translateX(-${domainIndex * 100}%)`,
                gap: 0,
              }}
            >

                {domainHeads.map((member, index) => (
                  <article
                    className={`kk-domain-person ${
                      index === domainIndex ? 'is-current' : ''
                    }`}
                    key={member.id}
                  >
                    <div className="kk-domain-person-photo">
                      <MemberPortrait
                        member={member}
                        className="kk-domain-person-image"
                      />

                      <span className="kk-domain-person-number">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="kk-domain-person-info">
                      <span className="kk-domain-person-role">
                        {member.domain || member.role}
                      </span>

                      <h3>{member.name}</h3>

                      <SocialLinks member={member} />
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="kk-domain-navigation">
              <span className="kk-domain-swipe-hint">
                SWIPE OR USE THE ARROWS TO EXPLORE
              </span>

              <div className="kk-domain-navigation-right">
                <span className="kk-domain-position">
                  {String(domainIndex + 1).padStart(2, '0')}
                  <span> / </span>
                  {String(domainHeads.length).padStart(2, '0')}
                </span>

                <button
                  type="button"
                  className="kk-domain-arrow"
                  onClick={() => moveDomains(-1)}
                  aria-label="Previous domain head"
                >
                  <ArrowLeft size={19} />
                </button>

                <button
                  type="button"
                  className="kk-domain-arrow"
                  onClick={() => moveDomains(1)}
                  aria-label="Next domain head"
                >
                  <ArrowRight size={19} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="kk-empty-state">
            No domain heads are available for {selectedYear}.
          </p>
        )}
      </section>

      {/* CLOSING SECTION */}
      <section className="kk-closing">
        <div className="kk-closing-pattern" />

        <div className="kk-closing-content">
          <span className="kk-closing-kicker">
            THIS IS OUR STORY
          </span>

          <h2>
            ಕನ್ನಡ ನಮ್ಮ ಹೆಮ್ಮೆ.
            <br />
            <span>ನಮ್ಮ ಜನ ನಮ್ಮ ಶಕ್ತಿ.</span>
          </h2>

          <p>
            Our language connects us. Our people move us forward.
            Come be a part of the journey.
          </p>

          <Button className="kk-join-button" size="lg" asChild>
            <Link to="/contact">
              Be Part of Our Story
              <ArrowUpRight size={18} />
            </Link>
          </Button>
        </div>

        <span className="kk-closing-mark">ಕನ್ನಡ ಕೂಟ</span>
      </section>
    </main>
  );
}
