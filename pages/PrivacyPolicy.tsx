import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
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
                <span className="font-bold text-white text-lg">Privacy Policy</span>
                <div className="w-10"></div>
            </div>

            <div className="flex-1 max-w-4xl mx-auto w-full p-6 md:p-10 space-y-8 animate-fade-in">
                <div className="text-center mb-8 mt-4">
                    <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-500/20">
                        <Shield className="w-8 h-8 text-primary-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
                    <p className="text-slate-400 text-sm border-b border-slate-800 pb-6 inline-block">Last Updated: March 2026</p>
                </div>

                <section className="space-y-6 text-slate-300 leading-relaxed text-sm md:text-base">
                    <h2 className="text-xl font-bold text-white text-left">1. Introduction</h2>
                    <p>Welcome to Orbyt (&quot;We&quot;, &quot;Us&quot;, or &quot;Our&quot;). We are committed to protecting your privacy and ensuring your personal data is handled securely and responsibly. This Privacy Policy explains how we collect, use, and share information when you use the Orbyt application (the &quot;Service&quot;).</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">2. Information We Collect</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Account Information:</strong> When you register, we collect your email address, profile picture (optional), display name, and date of birth to ensure you meet our minimum age requirement (18+).</li>
                        <li><strong>Location Data:</strong> To provide core features like the map and finding nearby users, we collect your precise geographic location. You can pause discoverability at any time to restrict this access.</li>
                        <li><strong>User Generated Content:</strong> We collect and store text, images, and other data you choose to post, comment, or message through the Service.</li>
                        <li><strong>Usage Data:</strong> We automatically log interactions with the app, device information, and IP addresses to improve performance and prevent abuse.</li>
                        <li><strong>Push Notification Token:</strong> A device token used solely to deliver push notifications to you. This is not shared with third parties.</li>
                        <li><strong>Device Permissions:</strong> We request access to your camera, microphone, and storage when you use specific features like uploading a profile picture or recording content.</li>
                    </ul>

                    <h2 className="text-xl font-bold text-white text-left pt-4">3. How We Use Your Information</h2>
                    <p>We use your data to:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Provide, personalize, and improve the Orbyt experience.</li>
                        <li>Calculate distances between you and other users for local discovery.</li>
                        <li>Enforce our Terms of Service and protect the community from abusive behavior.</li>
                        <li>Send essential notifications for messages, friend requests, and meetup updates.</li>
                    </ul>

                    <h2 className="text-xl font-bold text-white text-left pt-4">4. Sharing Your Information</h2>
                    <p>We do not sell your personal data. We may share information:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>With other users:</strong> Depending on your privacy settings, your profile and location data may be visible to users in your vicinity.</li>
                        <li><strong>For legal reasons:</strong> If requested by law enforcement or to protect the rights, property, or safety of Orbyt and our users.</li>
                    </ul>

                    <h2 className="text-xl font-bold text-white text-left pt-4">5. Data Retention and Deletion</h2>
                    <p>We retain your data as long as your account is active. You have the right to request deletion of your account and all associated data at any time via the &quot;Settings&quot; page. Upon deletion, your profile, posts, messages, and location history are permanently removed from our active databases.</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">6. Your Rights</h2>
                    <p>Depending on your location, you may have rights under the GDPR, CCPA, or other privacy laws. These rights include:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Access:</strong> The right to request copies of your personal data.</li>
                        <li><strong>Rectification:</strong> The right to request that we correct any information you believe is inaccurate.</li>
                        <li><strong>Erasure:</strong> The right to request that we erase your personal data under certain conditions.</li>
                        <li><strong>Portability:</strong> The right to request that we transfer the data that we have collected to another organization.</li>
                    </ul>

                    <h2 className="text-xl font-bold text-white text-left pt-4">7. Security</h2>
                    <p>We implement industry-standard security measures including HTTPS encryption for all data in transit. However, no electronic transmission or storage is 100% secure. You use the Service at your own risk.</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">8. Children's Privacy (Strict 18+)</h2>
                    <p>Orbyt is strictly intended for users aged 18 and above. We do not knowingly collect personal information from minors. For detailed information on our age verification and minor removal process, please read our <a href="/#/child-policy" className="text-primary-400 hover:underline">Child Safety Policy</a>.</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">9. Camera Usage</h2>
                    <p>Our app may request access to your device camera to allow you to capture photos or videos as part of app features (such as profile images or content sharing).</p>
                    <p>We do not access your camera without your explicit permission. Any images or videos captured are only used within the app and are not stored or shared without your consent.</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">10. Google Sign-In</h2>
                    <p>We use Google Sign-In to allow users to authenticate securely. When you sign in using Google, we may receive basic profile information such as your name, email address, and profile picture.</p>
                    <p>This data is used only for authentication and personalization purposes and is not shared with third parties.</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">11. Third-Party Services</h2>
                    <p>We may use trusted third-party services such as Google APIs to provide authentication, notifications, and core app functionality.</p>
                    <p>These services may collect limited data as per their own privacy policies. We recommend reviewing Google’s privacy policy for more information.</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">12. User Generated Content & Moderation</h2>
                    <p>Orbyt allows users to share content. We implement tools to report objectionable content and block users. We reserve the right to remove content or suspend accounts that violate our community guidelines or terms of service.</p>

                    <h2 className="text-xl font-bold text-white text-left pt-4">13. Contact Us & Data Protection</h2>
                    <p>If you have questions about this Privacy Policy or our data practices, please contact our Data Protection Officer at:</p>
                    <p>
                        <strong>Email:</strong> <a href="mailto:orbytapp@gmail.com" className="text-primary-400 hover:underline">orbytapp@gmail.com</a><br />
                        <strong>Address:</strong> Orbyt Inc., 16192 Coastal Highway, Lewes, Delaware 19958, USA
                    </p>
                </section>

                <p className="text-center text-slate-600 text-xs pt-4 pb-10">© {new Date().getFullYear()} Orbyt Inc. All rights reserved.</p>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
