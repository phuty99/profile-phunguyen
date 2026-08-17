function splitTags(text) {
  return (text || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export default function CvView({ profile }) {
  const skills = splitTags(profile.skills)
  const interests = splitTags(profile.interests)
  const contactLinks = [
    profile.location && { label: profile.location, href: null },
    profile.phone && { label: profile.phone, href: `tel:${profile.phone}` },
    profile.website_url && { label: 'Website', href: profile.website_url },
    profile.linkedin_url && { label: 'LinkedIn', href: profile.linkedin_url },
    profile.github_url && { label: 'GitHub', href: profile.github_url },
  ].filter(Boolean)

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-earth-200 overflow-hidden">
      <div className="bg-gradient-to-br from-earth-800 to-fire-700 text-white px-8 py-10 flex flex-col sm:flex-row items-center sm:items-end gap-6">
        <img
          src={profile.avatar_url || 'https://placehold.co/128x128?text=?'}
          alt="Avatar"
          className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md"
        />
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-3xl font-bold">{profile.full_name || 'Unnamed'}</h1>
          {profile.headline && <p className="text-earth-100 mt-1">{profile.headline}</p>}
        </div>
        {profile.cv_url && (
          <a
            href={profile.cv_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-md border border-white/30 shrink-0"
          >
            Download CV (PDF)
          </a>
        )}
      </div>

      {contactLinks.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 px-8 py-4 bg-earth-50 border-b border-earth-200 text-sm text-earth-700">
          {contactLinks.map((link, i) =>
            link.href ? (
              <a key={i} href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-fire-600 font-medium">
                {link.label}
              </a>
            ) : (
              <span key={i}>{link.label}</span>
            )
          )}
        </div>
      )}

      <div className="px-8 py-8 flex flex-col gap-8">
        {profile.bio && (
          <section>
            <h2 className="text-lg font-semibold text-earth-800 border-b border-earth-200 pb-2 mb-3">About</h2>
            <p className="text-earth-800 whitespace-pre-line">{profile.bio}</p>
          </section>
        )}

        {profile.experiences.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-earth-800 border-b border-earth-200 pb-2 mb-3">Experience</h2>
            <div className="flex flex-col gap-5">
              {profile.experiences.map((exp, i) => (
                <div key={i}>
                  <div className="flex flex-wrap justify-between gap-x-4">
                    <p className="font-medium text-earth-800">
                      {exp.title}
                      {exp.company && <span className="text-earth-600"> · {exp.company}</span>}
                    </p>
                    {(exp.start_date || exp.end_date) && (
                      <p className="text-sm text-earth-500 whitespace-nowrap">
                        {exp.start_date}
                        {exp.start_date && exp.end_date ? ' – ' : ''}
                        {exp.end_date}
                      </p>
                    )}
                  </div>
                  {exp.description && <p className="text-earth-700 mt-1 whitespace-pre-line">{exp.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {profile.educations.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-earth-800 border-b border-earth-200 pb-2 mb-3">Education</h2>
            <div className="flex flex-col gap-5">
              {profile.educations.map((edu, i) => (
                <div key={i}>
                  <div className="flex flex-wrap justify-between gap-x-4">
                    <p className="font-medium text-earth-800">
                      {edu.school}
                      {edu.degree && <span className="text-earth-600"> · {edu.degree}</span>}
                    </p>
                    {(edu.start_date || edu.end_date) && (
                      <p className="text-sm text-earth-500 whitespace-nowrap">
                        {edu.start_date}
                        {edu.start_date && edu.end_date ? ' – ' : ''}
                        {edu.end_date}
                      </p>
                    )}
                  </div>
                  {edu.description && <p className="text-earth-700 mt-1 whitespace-pre-line">{edu.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {profile.projects.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-earth-800 border-b border-earth-200 pb-2 mb-3">Projects</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {profile.projects.map((proj) => {
                const tech = splitTags(proj.tech_stack)
                return (
                  <div key={proj.id} className="border border-earth-200 rounded-lg overflow-hidden flex flex-col">
                    {proj.thumbnail_url && (
                      <img src={proj.thumbnail_url} alt="" className="w-full h-36 object-cover" />
                    )}
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <p className="font-medium text-earth-800">{proj.title}</p>
                      {proj.description && (
                        <p className="text-earth-700 text-sm whitespace-pre-line">{proj.description}</p>
                      )}
                      {tech.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {tech.map((t, i) => (
                            <span key={i} className="bg-earth-100 text-earth-800 text-xs px-2 py-0.5 rounded-full">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-4 mt-auto pt-2 text-sm">
                        {proj.demo_url && (
                          <a href={proj.demo_url} target="_blank" rel="noopener noreferrer" className="text-fire-600 hover:text-fire-700 font-medium">
                            Live demo
                          </a>
                        )}
                        {proj.github_url && (
                          <a href={proj.github_url} target="_blank" rel="noopener noreferrer" className="text-fire-600 hover:text-fire-700 font-medium">
                            Source
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {skills.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-earth-800 border-b border-earth-200 pb-2 mb-3">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, i) => (
                <span key={i} className="bg-earth-100 text-earth-800 text-sm px-3 py-1 rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {interests.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-earth-800 border-b border-earth-200 pb-2 mb-3">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest, i) => (
                <span key={i} className="bg-fire-50 text-fire-700 text-sm px-3 py-1 rounded-full">
                  {interest}
                </span>
              ))}
            </div>
          </section>
        )}

        {profile.images.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-earth-800 border-b border-earth-200 pb-2 mb-3">Gallery</h2>
            <div className="grid grid-cols-3 gap-3">
              {profile.images.map((img) => (
                <img key={img.id} src={img.url} alt="" className="w-full h-28 object-cover rounded-md border border-earth-200" />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
