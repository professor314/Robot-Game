namespace CSharpRPG
{
    partial class frmStats
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
            this.label1 = new System.Windows.Forms.Label();
            this.progressBar1 = new System.Windows.Forms.ProgressBar();
            this.lblCurrentHP = new System.Windows.Forms.Label();
            this.lblMaxHP = new System.Windows.Forms.Label();
            this.btnClose = new System.Windows.Forms.Button();
            this.listView1 = new System.Windows.Forms.ListView();
            this.btnUnequip = new System.Windows.Forms.Button();
            this.SuspendLayout();
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Location = new System.Drawing.Point(13, 13);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(55, 13);
            this.label1.TabIndex = 0;
            this.label1.Text = "Hit Points:";
            // 
            // progressBar1
            // 
            this.progressBar1.Location = new System.Drawing.Point(74, 12);
            this.progressBar1.Name = "progressBar1";
            this.progressBar1.Size = new System.Drawing.Size(171, 23);
            this.progressBar1.TabIndex = 1;
            // 
            // lblCurrentHP
            // 
            this.lblCurrentHP.AutoSize = true;
            this.lblCurrentHP.Location = new System.Drawing.Point(152, 38);
            this.lblCurrentHP.Name = "lblCurrentHP";
            this.lblCurrentHP.Size = new System.Drawing.Size(13, 13);
            this.lblCurrentHP.TabIndex = 2;
            this.lblCurrentHP.Text = "0";
            // 
            // lblMaxHP
            // 
            this.lblMaxHP.AutoSize = true;
            this.lblMaxHP.Location = new System.Drawing.Point(251, 22);
            this.lblMaxHP.Name = "lblMaxHP";
            this.lblMaxHP.Size = new System.Drawing.Size(13, 13);
            this.lblMaxHP.TabIndex = 3;
            this.lblMaxHP.Text = "0";
            // 
            // btnClose
            // 
            this.btnClose.DialogResult = System.Windows.Forms.DialogResult.Cancel;
            this.btnClose.Location = new System.Drawing.Point(254, 310);
            this.btnClose.Name = "btnClose";
            this.btnClose.Size = new System.Drawing.Size(75, 23);
            this.btnClose.TabIndex = 4;
            this.btnClose.Text = "&Close";
            this.btnClose.UseVisualStyleBackColor = true;
            this.btnClose.Click += new System.EventHandler(this.btnClose_Click);
            // 
            // listView1
            // 
            this.listView1.Location = new System.Drawing.Point(12, 64);
            this.listView1.Name = "listView1";
            this.listView1.Size = new System.Drawing.Size(312, 212);
            this.listView1.TabIndex = 5;
            this.listView1.UseCompatibleStateImageBehavior = false;
            this.listView1.MouseDoubleClick += new System.Windows.Forms.MouseEventHandler(this.listView1_MouseDoubleClick);
            this.listView1.SelectedIndexChanged += new System.EventHandler(this.listView1_SelectedIndexChanged);
            this.listView1.KeyUp += new System.Windows.Forms.KeyEventHandler(this.listView1_KeyUp);
            // 
            // btnUnequip
            // 
            this.btnUnequip.Location = new System.Drawing.Point(123, 282);
            this.btnUnequip.Name = "btnUnequip";
            this.btnUnequip.Size = new System.Drawing.Size(81, 25);
            this.btnUnequip.TabIndex = 6;
            this.btnUnequip.Text = "&Unequip";
            this.btnUnequip.UseVisualStyleBackColor = true;
            this.btnUnequip.Click += new System.EventHandler(this.btnUnequip_Click);
            // 
            // frmStats
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.CancelButton = this.btnClose;
            this.ClientSize = new System.Drawing.Size(337, 345);
            this.ControlBox = false;
            this.Controls.Add(this.btnUnequip);
            this.Controls.Add(this.listView1);
            this.Controls.Add(this.btnClose);
            this.Controls.Add(this.lblMaxHP);
            this.Controls.Add(this.lblCurrentHP);
            this.Controls.Add(this.progressBar1);
            this.Controls.Add(this.label1);
            this.Name = "frmStats";
            this.Text = "Stats";
            this.Load += new System.EventHandler(this.frmStats_Load);
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.ProgressBar progressBar1;
        private System.Windows.Forms.Label lblCurrentHP;
        private System.Windows.Forms.Label lblMaxHP;
        private System.Windows.Forms.Button btnClose;
        private System.Windows.Forms.ListView listView1;
        private System.Windows.Forms.Button btnUnequip;
    }
}