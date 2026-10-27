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
          <Icon size={17} />
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
}

export default function Team() {
  const allYears = getAllYears();

  const [selectedYear, setSelectedYear] = useState(
    allYears[0] || new Date().getFullYear()
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const clubHeads = getClubHeads(selectedYear);
  const domainHeads = getDomainHeads(selectedYear);

  const activeMember = clubHeads[activeIndex];

  const changeYear = (year: number) => {
    setSelectedYear(year);
    setActiveIndex(0);
  };

  const changeMember = (direction: number) => {
    if (!clubHeads.length) return;

    setActiveIndex(
      (current) =>
        (current + direction + clubHeads.length) % clubHeads.length
    );
  };

  const handleTouchEnd = (endX: number) => {
    if (touchStart === null) return;

    const difference = endX - touchStart;

    if (Math.abs(difference) > 50) {
      changeMember(difference < 0 ? 1 : -1);
    }

    setTouchStart(null);
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

          {/* Core team group photograph */}
          <div className="kk-group-photo">
            <img
              src="/kannada-koota-team.jpg"
              alt="Kannada Koota ECC Core Team"
              className="kk-group-photo-image"
              loading="lazy"
            />

            <div className="kk-group-photo-overlay" />

            <div className="kk-group-photo-content">
              <span className="kk-group-kannada">
                ಒಂದೇ ಕುಟುಂಬ
              </span>

              <span className="kk-group-english">
                ONE COMMUNITY. MANY STORIES.
              </span>
            </div>

            <span className="kk-photo-index">KKC / ECC</span>
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

      {/* CLUB HEADS / CORE TEAM */}
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

        {activeMember ? (
          <div className="kk-leader-showcase">
            <div
              className="kk-leader-visual"
              onTouchStart={(event) =>
                setTouchStart(event.touches[0].clientX)
              }
              onTouchEnd={(event) =>
                handleTouchEnd(event.changedTouches[0].clientX)
              }
            >
              <div className="kk-leader-visual-top">
                <span>KKC / {selectedYear}</span>
                <span>
                  {String(activeIndex + 1).padStart(2, '0')} —{' '}
                  {String(clubHeads.length).padStart(2, '0')}
                </span>
              </div>

              <div className="kk-leader-image-frame" key={activeMember.id}>
                <MemberPortrait
                  member={activeMember}
                  className="kk-leader-image"
                />

                <div className="kk-leader-image-caption">
                  <Sparkles size={16} />
                  <span>THE PEOPLE MAKE THE CULTURE</span>
                </div>
              </div>

              <div className="kk-leader-visual-bottom">
                <span>ನಮ್ಮ ಹೆಮ್ಮೆ</span>
                <span>OUR PRIDE</span>
              </div>
            </div>

            <div className="kk-leader-details" key={activeMember.id}>
              <span className="kk-member-number">
                MEMBER NO. {String(activeIndex + 1).padStart(2, '0')}
              </span>

              <h3>{activeMember.name}</h3>

              <span className="kk-role-label">
                {activeMember.role}
              </span>

              {activeMember.bio && (
                <p className="kk-leader-bio">{activeMember.bio}</p>
              )}

              <p className="kk-leader-quote">
                “Culture lives on through the people who carry it forward.”
              </p>

              <SocialLinks member={activeMember} />

              <div className="kk-leader-navigation">
                <div className="kk-leader-dots">
                  {clubHeads.map((member, index) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`kk-leader-dot ${
                        activeIndex === index ? 'active' : ''
                      }`}
                      aria-label={`View ${member.name}`}
                      aria-pressed={activeIndex === index}
                    />
                  ))}
                </div>

                <div className="kk-arrow-buttons">
                  <button
                    type="button"
                    onClick={() => changeMember(-1)}
                    className="kk-arrow-button"
                    aria-label="Previous team leader"
                  >
                    <ArrowLeft size={19} />
                  </button>

                  <button
                    type="button"
                    onClick={() => changeMember(1)}
                    className="kk-arrow-button kk-arrow-next"
                    aria-label="Next team leader"
                  >
                    <ArrowRight size={19} />
                  </button>
                </div>
              </div>

              <span className="kk-swipe-hint">
                SWIPE OR USE THE ARROWS TO EXPLORE
              </span>
            </div>
          </div>
        ) : (
          <p className="kk-empty-state">
            No leadership details are available for {selectedYear}.
          </p>
        )}
      </section>

      {/* DOMAIN HEADS */}
      <section className="kk-domains">
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
              From planning and design to culture and communication,
              every contribution makes a difference.
            </p>
          </div>

          <div className="kk-domain-count">
            <strong>{String(domainHeads.length).padStart(2, '0')}</strong>
            <span>DOMAIN HEADS</span>
          </div>
        </div>

        {domainHeads.length > 0 ? (
          <div className="kk-domain-grid">
            {domainHeads.map((member, index) => (
              <article className="kk-domain-member" key={member.id}>
                <div className="kk-domain-image-wrap">
                  <MemberPortrait
                    member={member}
                    className="kk-domain-image"
                  />

                  <span className="kk-domain-index">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="kk-domain-image-overlay" />
                </div>

                <div className="kk-domain-info">
                  <span className="kk-domain-role">
                    DOMAIN HEAD
                  </span>

                  <h3>{member.name}</h3>

                  {member.domain && (
                    <p className="kk-domain-name">{member.domain}</p>
                  )}

                  {member.bio && (
                    <p className="kk-domain-bio">{member.bio}</p>
                  )}

                  <div className="kk-domain-footer">
                    <SocialLinks member={member} />

                    <span className="kk-domain-arrow">
                      <ArrowUpRight size={18} />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
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
