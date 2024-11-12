import React from 'react';
import { motion } from 'framer-motion';

const PrivacyPolicy = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto p-6"
    >
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Data Collection and Usage</h2>
          <p>We collect and process the following personal data:</p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Name and contact information</li>
            <li>Employment details</li>
            <li>Timesheet records</li>
            <li>Payment information</li>
            <li>Documents and identification</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Data Protection Rights</h2>
          <p>Under GDPR, you have the following rights:</p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Right to access your personal data</li>
            <li>Right to rectification of incorrect data</li>
            <li>Right to erasure ("right to be forgotten")</li>
            <li>Right to data portability</li>
            <li>Right to restrict processing</li>
            <li>Right to object to processing</li>
          </ul>
        </section>

        {/* Add more sections as needed */}
      </div>
    </motion.div>
  );
};

export default PrivacyPolicy; 