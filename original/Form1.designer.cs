namespace CSharpRPG
{
    partial class Form1
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
            this.btnStats = new System.Windows.Forms.Button();
            this.fireBox1 = new FireBox();
            this.btnLog = new System.Windows.Forms.Button();
            ((System.ComponentModel.ISupportInitialize)(this.fireBox1)).BeginInit();
            this.SuspendLayout();
            // 
            // btnStats
            // 
            this.btnStats.Location = new System.Drawing.Point(309, 8);
            this.btnStats.Name = "btnStats";
            this.btnStats.Size = new System.Drawing.Size(75, 23);
            this.btnStats.TabIndex = 1;
            this.btnStats.Text = "Stats";
            this.btnStats.UseVisualStyleBackColor = true;
            this.btnStats.Click += new System.EventHandler(this.btnStats_Click);
            this.btnStats.KeyDown += new System.Windows.Forms.KeyEventHandler(this.Form1_KeyDown);
            // 
            // fireBox1
            // 
            this.fireBox1.BoxBorder = false;
            this.fireBox1.Location = new System.Drawing.Point(12, 37);
            this.fireBox1.Name = "fireBox1";
            this.fireBox1.Size = new System.Drawing.Size(381, 300);
            this.fireBox1.TabIndex = 0;
            this.fireBox1.TabStop = false;
            // 
            // btnLog
            // 
            this.btnLog.Location = new System.Drawing.Point(228, 8);
            this.btnLog.Name = "btnLog";
            this.btnLog.Size = new System.Drawing.Size(75, 23);
            this.btnLog.TabIndex = 2;
            this.btnLog.Text = "Log";
            this.btnLog.UseVisualStyleBackColor = true;
            this.btnLog.Click += new System.EventHandler(this.btnLog_Click);
            // 
            // Form1
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(405, 349);
            this.Controls.Add(this.btnLog);
            this.Controls.Add(this.btnStats);
            this.Controls.Add(this.fireBox1);
            this.Name = "Form1";
            this.Text = "Form1";
            this.Load += new System.EventHandler(this.Form1_Load);
            this.KeyDown += new System.Windows.Forms.KeyEventHandler(this.Form1_KeyDown);
            ((System.ComponentModel.ISupportInitialize)(this.fireBox1)).EndInit();
            this.ResumeLayout(false);

        }

        #endregion

        private FireBox fireBox1;
        private System.Windows.Forms.Button btnStats;
        private System.Windows.Forms.Button btnLog;
    }
}

