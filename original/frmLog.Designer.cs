namespace CSharpRPG
{
    partial class frmLog
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.listLog = new System.Windows.Forms.ListBox();
            this.btnClear = new System.Windows.Forms.Button();
            this.btnHide = new System.Windows.Forms.Button();
            this.SuspendLayout();
            // 
            // listLog
            // 
            this.listLog.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Right)));
            this.listLog.FormattingEnabled = true;
            this.listLog.HorizontalScrollbar = true;
            this.listLog.Location = new System.Drawing.Point(12, 21);
            this.listLog.Name = "listLog";
            this.listLog.Size = new System.Drawing.Size(317, 290);
            this.listLog.TabIndex = 0;
            // 
            // btnClear
            // 
            this.btnClear.Location = new System.Drawing.Point(12, 356);
            this.btnClear.Name = "btnClear";
            this.btnClear.Size = new System.Drawing.Size(113, 23);
            this.btnClear.TabIndex = 1;
            this.btnClear.Text = "Clear";
            this.btnClear.UseVisualStyleBackColor = true;
            this.btnClear.Click += new System.EventHandler(this.btnClear_Click);
            // 
            // btnHide
            // 
            this.btnHide.Location = new System.Drawing.Point(216, 356);
            this.btnHide.Name = "btnHide";
            this.btnHide.Size = new System.Drawing.Size(113, 23);
            this.btnHide.TabIndex = 2;
            this.btnHide.Text = "Hide";
            this.btnHide.UseVisualStyleBackColor = true;
            this.btnHide.Click += new System.EventHandler(this.btnHide_Click);
            // 
            // frmLog
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(343, 394);
            this.ControlBox = false;
            this.Controls.Add(this.btnHide);
            this.Controls.Add(this.btnClear);
            this.Controls.Add(this.listLog);
            this.Name = "frmLog";
            this.Text = "Log";
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.ListBox listLog;
        private System.Windows.Forms.Button btnClear;
        private System.Windows.Forms.Button btnHide;
    }
}