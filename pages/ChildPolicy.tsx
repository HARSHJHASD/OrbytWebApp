import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Baby } from 'lucide-react';

const ChildPolicy: React.FC = () => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-slate-900/80 backdrop-blur-md px-4 py-3 shadow-sm z-30 sticky top-0 border-b border-slate-800 flex items-center justify-between">
                <button
                    onClick={handleBack}
                    className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <span className="font-bold text-white text-lg">Child Safety Policy</span>
                <div className="w-10"></div>
            </div>

            <div className="flex-1 max-w-4xl mx-auto w-full p-6 md:p-10 space-y-8 animate-fade-in">
                <div className="text-center mb-8 mt-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <Baby className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Child Safety Policy</h1>
                    <p className="text-slate-400 text-sm border-b border-slate-800 pb-6 inline-block">Strict 18+ Requirement • COPPA &amp; GDPR-K Compliance</p>
                    <p className="text-slate-500 text-xs mt-4">Last updated: May 1, 2026</p>
                </div>

                <section className="space-y-6 text-slate-300 leading-relaxed text-sm md:text-base">

                    <h2 className="text-xl font-bold text-white text-left">1. Minimum Age Requirement</h2>
                    <p>Orbyt is a social discovery platform designed exclusively for adults. You must be at least 18 years of age to create an account, access the Service, or interact with other users. We explicitly prohibit use of the Service by individuals under 18.</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">2. Age Verification</h2>
                    <p>We enforce the 18+ requirement through the following mechanisms:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>All users must provide their date of birth (DOB) during onboarding. Users who are under 18 are automatically denied access and cannot proceed.</li>
                        <li>Our backend validates the DOB at the point of account creation and enforces a hard age gate — accounts with a DOB indicating the user is under 18 are rejected at registration.</li>
                        <li>Users must certify their age truthfully at registration. Providing a false age is a violation of our Terms of Service and may result in permanent account termination.</li>
                    </ul>

                    <h2 className="text-xl font-bold text-white text-left pt-4">3. No Data Collection from Minors</h2>
                    <p>Orbyt does not knowingly collect, use, share, or store personal information from individuals under the age of 18. Our platform, features, and data practices are not directed at children. We have no systems, features, or processes that target minors.</p>
                    <p className="pt-2">If we discover or are notified that a minor has provided us with personal information, we will immediately delete such information from our systems. If you believe we have inadvertently collected information from a minor, please contact us at <a href="mailto:orbytapp@gmail.com" className="text-red-400 hover:underline">orbytapp@gmail.com</a>.</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">4. Zero Tolerance for Minors</h2>
                    <p>We do not knowingly permit minors to use our platform. If we discover that an individual under 18 has created an account, we will:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Immediately terminate the account without notice.</li>
                        <li>Delete all associated personal data from our servers.</li>
                        <li>Blacklist any unique identifiers associated with the attempt to prevent re-registration.</li>
                    </ul>

                    <h2 className="text-xl font-bold text-white text-left pt-4">5. Zero Tolerance for Child Sexual Abuse Material (CSAM)</h2>
                    <p>Orbyt has an absolute zero-tolerance policy for child sexual abuse material (CSAM) or any content that sexually exploits, endangers, or abuses minors in any way. This includes:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Images, videos, text, or any content that sexually exploits children.</li>
                        <li>Grooming, solicitation, or predatory behavior directed at minors.</li>
                        <li>Any content that sexualizes children, even if fictional or illustrated.</li>
                    </ul>
                    <p className="pt-2">Any account found to be distributing, soliciting, or engaging with such content will be permanently banned and reported to law enforcement immediately.</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">6. Reporting to Authorities</h2>
                    <p>We are committed to full compliance with all applicable laws regarding child safety. If we discover any CSAM or evidence of child exploitation on our platform, we will:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Immediately remove the content and suspend the responsible account.</li>
                        <li>Report the incident to the <strong>National Center for Missing &amp; Exploited Children (NCMEC)</strong> CyberTipline, as required by US law (18 U.S.C. § 2258A), and to applicable local law enforcement authorities.</li>
                        <li>Preserve all evidence and cooperate fully with any law enforcement investigation.</li>
                    </ul>

                    <h2 className="text-xl font-bold text-white text-left pt-4">7. Reporting an Underage User</h2>
                    <p>We rely on our community to help keep Orbyt an adult-only environment. If you believe a user is under the age of 18, please use the in-app "Report" feature on their profile or contact us immediately.</p>
                    <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                        <p className="font-bold text-white mb-2">Email Reporting:</p>
                        <p>Please send an email to <a href="mailto:orbytapp@gmail.com" className="text-red-400 hover:underline">orbytapp@gmail.com</a> with the subject line "Underage User Report" and include the user's display name or profile link.</p>
                    </div>

                    <h2 className="text-xl font-bold text-white text-left pt-4">8. Parental Information</h2>
                    <p>If you are a parent or legal guardian and believe your child has created an account on Orbyt, please contact us at the email provided above. We will work with you to verify the account and ensure it is promptly removed and all associated data is deleted.</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">9. Content Safety &amp; Moderation</h2>
                    <p>Because Orbyt is restricted to adults, content shared on the platform may reflect adult themes. This further underscores our commitment to keeping minors off the platform. We use automated filters and human moderation to prevent the exploitation or abuse of any individual, regardless of age.</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">10. Policy Updates</h2>
                    <p>We may update this Child Safety Policy as industry standards and legal requirements evolve. Significant changes will be communicated via the app or email. The "Last updated" date at the top of this page reflects the most recent revision.</p>

                </section>

                <p className="text-center text-slate-600 text-xs pt-4 pb-10">© {new Date().getFullYear()} Orbyt Inc. All rights reserved.</p>
            </div>
        </div>
    );
};

export default ChildPolicy;
