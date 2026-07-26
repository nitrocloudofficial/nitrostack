'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function CodeDiffWidget() {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div style={{ backgroundColor: '#282c34', minHeight: '100vh' }} />;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#282c34', color: '#abb2bf', borderRadius: '10px' }}>
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
        <h2 style={{ color: '#61afef', fontFamily: 'sans-serif' }}>🛠️ AI Auto-Remediation Plan</h2>
        <p style={{ fontFamily: 'sans-serif' }}>Proposed Infrastructure Patch (main.tf)</p>
        
        <div style={{ backgroundColor: '#1e2227', padding: '15px', borderRadius: '5px', marginTop: '15px', border: '1px solid #3e4451' }}>
          <div style={{ color: '#e06c75', backgroundColor: '#ffeef011', padding: '5px' }}>
            - resource "aws_security_group_rule" "allow_all" {'{'}
          </div>
          <div style={{ color: '#e06c75', backgroundColor: '#ffeef011', padding: '5px' }}>
            -   type        = "ingress"
          </div>
          <div style={{ color: '#e06c75', backgroundColor: '#ffeef011', padding: '5px' }}>
            -   from_port   = 0
          </div>
          <div style={{ color: '#e06c75', backgroundColor: '#ffeef011', padding: '5px' }}>
            -   to_port     = 0
          </div>
          <div style={{ color: '#e06c75', backgroundColor: '#ffeef011', padding: '5px' }}>
            -   cidr_blocks = ["0.0.0.0/0"]
          </div>
          <div style={{ color: '#e06c75', backgroundColor: '#ffeef011', padding: '5px' }}>
            - {'}'}
          </div>
          
          <div style={{ color: '#98c379', backgroundColor: '#e6ffed11', padding: '5px', marginTop: '10px' }}>
            + resource "aws_security_group_rule" "restrict_ssh_to_vpn" {'{'}
          </div>
          <div style={{ color: '#98c379', backgroundColor: '#e6ffed11', padding: '5px' }}>
            +   type        = "ingress"
          </div>
          <div style={{ color: '#98c379', backgroundColor: '#e6ffed11', padding: '5px' }}>
            +   from_port   = 22
          </div>
          <div style={{ color: '#98c379', backgroundColor: '#e6ffed11', padding: '5px' }}>
            +   to_port     = 22
          </div>
          <div style={{ color: '#98c379', backgroundColor: '#e6ffed11', padding: '5px' }}>
            +   cidr_blocks = ["10.0.0.0/8"] // Corporate VPN only
          </div>
          <div style={{ color: '#98c379', backgroundColor: '#e6ffed11', padding: '5px' }}>
            + {'}'}
          </div>
        </div>

        <p style={{ marginTop: '15px', color: '#d19a66', fontFamily: 'sans-serif' }}>
          * Wait for Human-in-the-Loop approval before applying this Terraform patch.
        </p>
      </motion.div>
    </div>
  );
}
