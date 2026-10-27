import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText } from 'lucide-react';
import { safeBack } from "../util/safeBack";

const TermsOfService: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-slate-900/80 backdrop-blur-md px-4 py-3 shadow-sm z-30 sticky top-0 border-b border-slate-800 flex items-center justify-between">
                <button
                    onClick={() => safeBack(navigate, "/")}
                    className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <span className="font-bold text-white text-lg">Terms of Service</span>
                <div className="w-10"></div>
            </div>

            <div className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-8 animate-fade-in pb-16">
                <div className="text-center mb-8 mt-4">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                        <FileText className="w-8 h-8 text-blue-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
                    <p className="text-slate-400 text-sm border-b border-slate-800 pb-6 inline-block">Last Updated: {new Date().toLocaleDateString()}</p>
                </div>

                <section className="space-y-4 text-slate-300 leading-relaxed text-sm">
                    <h2 className="text-xl font-bold text-white text-left">1. Acceptance of Terms</h2>
                    <p>By downloading, accessing, or using Orbyt (the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">2. Eligibility</h2>
                    <p>You must be at least 18 years old to use the Service. By using the Service, you represent and warrant that you are 18 or older and have the right, authority, and capacity to enter into this agreement.</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">3. User Conduct and User Generated Content (UGC)</h2>
                    <p>Orbyt allows users to interact, create profiles, and upload content (posts, photos, messages). You are solely responsible for your conduct and the content you provide. You agree NOT to:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Post or share content that is illegal, abusive, harassing, threatening, discriminatory, defamatory, or obscene.</li>
                        <li>Post explicit, pornographic, or excessively violent imagery.</li>
                        <li>Post content that promotes or facilitates self-harm, eating disorders, or violence.</li>
                        <li>Impersonate others or provide false identity information.</li>
                        <li>Spam, scam, or solicit other users for commercial purposes.</li>
                        <li>Use the app to facilitate illegal activities or drug-related transactions.</li>
                    </ul>

                    <h2 className="text-xl font-bold text-white text-left pt-4">4. Moderation & Zero Tolerance Policy</h2>
                    <p>We have a <strong>zero-tolerance policy</strong> for objectionable content or abusive users. We reserve the right, but not the obligation, to monitor, review, and remove any content or accounts that violate these Terms. Users have the ability to report inappropriate content and block abusive users. We will act on reports promptly, typically within 24 hours. Accounts found in violation may be permanently banned without a refund of any potential fees.</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">5. Safety and Real-World Interactions</h2>
                    <p>Orbyt facilitates real-world meetups. We do not verify the criminal background of our users. You use the Service at your own risk. Always exercise caution, meet in public places, and trust your instincts when interacting with people you meet through the app.</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">6. Account Termination</h2>
                    <p>We may suspend or terminate your account at our sole discretion, without prior notice, if we believe you have violated these Terms. You may also terminate your account at any time within the app's settings.</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">7. Disclaimer of Warranties</h2>
                    <p>The Service is provided "as is" and "as available" without any warranties of any kind. We do not guarantee continuous, uninterrupted access to the Service.</p>
                </section>
            </div>
        </div>
    );
};

export default TermsOfService;
